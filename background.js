importScripts('zip-store.js');

const ALLOWED_HOST = 'assets.grok.com';
const FOLDER = 'grok_images';
const FETCH_CONCURRENCY = 4;

/** @type {{ running: boolean, cancel: boolean, cancelled: boolean, total: number, done: number, failed: number, skipped: number, phase: string }} */
let job = {
  running: false,
  cancel: false,
  cancelled: false,
  total: 0,
  done: 0,
  failed: 0,
  skipped: 0,
  phase: ''
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadAll') {
    if (job.running) {
      sendResponse({ success: false, error: '已有下载任务进行中' });
      return false;
    }

    const urls = Array.isArray(request.urls) ? request.urls : [];
    const started = startDownloadJob(urls);
    sendResponse(started);
    return false;
  }

  if (request.action === 'cancelDownload') {
    if (job.running) job.cancel = true;
    sendResponse({ ok: true });
    return false;
  }

  if (request.action === 'getDownloadStatus') {
    sendResponse(snapshot());
    return false;
  }
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

function snapshot() {
  return {
    running: job.running,
    total: job.total,
    done: job.done,
    failed: job.failed,
    skipped: job.skipped,
    cancel: job.cancel,
    cancelled: job.cancelled,
    phase: job.phase
  };
}

function startDownloadJob(urls) {
  const valid = [];
  let skipped = 0;

  for (const url of urls) {
    if (isAllowedUrl(url)) valid.push(url);
    else skipped++;
  }

  job = {
    running: valid.length > 0,
    cancel: false,
    cancelled: false,
    total: valid.length,
    done: 0,
    failed: 0,
    skipped,
    phase: 'fetch'
  };

  if (valid.length === 0) {
    broadcastProgress(true);
    return {
      success: false,
      started: false,
      error: '没有可下载的有效图片链接',
      total: 0,
      skipped
    };
  }

  broadcastProgress();
  runZipDownload(valid).catch((e) => {
    console.warn('[grok-dl] job crashed:', e);
    job.running = false;
    job.phase = 'error';
    broadcastProgress(true);
  });

  return { success: true, started: true, total: valid.length, skipped, mode: 'zip' };
}

async function runZipDownload(valid) {
  const stamp = formatStamp(new Date());

  // 仅 1 张：直接下，不打 ZIP
  if (valid.length === 1) {
    job.phase = 'save';
    broadcastProgress();
    try {
      await chrome.downloads.download({
        url: valid[0],
        filename: `${FOLDER}/${stamp}_${getFileName(valid[0])}`,
        conflictAction: 'uniquify',
        saveAs: false
      });
      job.done = 1;
    } catch (e) {
      job.failed = 1;
      console.warn('[grok-dl] single download failed', e);
    }
    finishJob();
    return;
  }

  job.phase = 'fetch';
  const files = [];
  const nameUsed = new Map();

  await mapPool(valid, FETCH_CONCURRENCY, async (url, index) => {
    if (job.cancel) {
      job.cancelled = true;
      return;
    }

    try {
      const res = await fetch(url, { credentials: 'omit', cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      if (!buf.length) throw new Error('empty body');

      let base = getFileName(url);
      const count = (nameUsed.get(base) || 0) + 1;
      nameUsed.set(base, count);
      if (count > 1) {
        const dot = base.lastIndexOf('.');
        base = dot > 0
          ? `${base.slice(0, dot)}_${count}${base.slice(dot)}`
          : `${base}_${count}`;
      }
      const name = `${String(index + 1).padStart(3, '0')}_${base}`;
      files.push({ name, data: buf, index });
      job.done++;
    } catch (e) {
      job.failed++;
      console.warn('[grok-dl] fetch failed:', url, e);
    }

    broadcastProgress();
  });

  if (job.cancel) {
    job.cancelled = true;
    finishJob();
    return;
  }

  if (!files.length) {
    finishJob();
    return;
  }

  files.sort((a, b) => a.index - b.index);

  job.phase = 'pack';
  broadcastProgress();

  const zipBytes = createStoreZip(files.map(({ name, data }) => ({ name, data })));

  if (job.cancel) {
    job.cancelled = true;
    finishJob();
    return;
  }

  job.phase = 'save';
  broadcastProgress();

  const zipName = `${FOLDER}/grok_images_${stamp}.zip`;
  try {
    await downloadZipBytes(zipBytes, zipName);
  } catch (e) {
    console.warn('[grok-dl] zip save failed, fallback to individual:', e);
    await fallbackIndividual(files, stamp);
  }

  finishJob();
}

async function fallbackIndividual(files, stamp) {
  for (const file of files) {
    if (job.cancel) {
      job.cancelled = true;
      break;
    }
    try {
      const url = bytesToDataUrl(file.data, guessMime(file.name));
      await chrome.downloads.download({
        url,
        filename: `${FOLDER}/${stamp}/${file.name}`,
        conflictAction: 'uniquify',
        saveAs: false
      });
    } catch (e) {
      console.warn('[grok-dl] fallback item failed', file.name, e);
    }
  }
}

function guessMime(name) {
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.webp$/i.test(name)) return 'image/webp';
  if (/\.gif$/i.test(name)) return 'image/gif';
  return 'image/jpeg';
}

function bytesToDataUrl(bytes, mime) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

async function downloadZipBytes(bytes, filename) {
  await ensureOffscreen();
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const reply = await chrome.runtime.sendMessage({
    action: 'offscreenDownloadZip',
    buffer: copy,
    filename
  });
  if (!reply?.ok) {
    throw new Error(reply?.error || 'offscreen download failed');
  }
}

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [chrome.runtime.getURL('offscreen.html')]
  });
  if (contexts && contexts.length) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['BLOBS'],
    justification: 'Create a blob URL to save the packed ZIP in one download'
  });
}

function finishJob() {
  if (job.cancel) job.cancelled = true;
  job.running = false;
  job.cancel = false;
  broadcastProgress(true);

  const packed = job.done;
  try {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon.png',
      title: job.cancelled ? '下载已取消' : 'Grok 图片打包完成',
      message: job.cancelled
        ? `已处理 ${packed}/${job.total} 张后取消`
        : job.failed
          ? `ZIP 内含 ${packed} 张，失败 ${job.failed} 张`
          : `已保存 1 个 ZIP（内含 ${packed} 张图片）`
    });
  } catch (_) {}
}

async function mapPool(items, limit, worker) {
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      if (job.cancel) return;
      const idx = i++;
      await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
}

function isAllowedUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === ALLOWED_HOST;
  } catch {
    return false;
  }
}

function getFileName(url) {
  try {
    const u = new URL(url);
    let name = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || 'image');
    name = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 120);
    if (!/\.(jpe?g|png|gif|webp|bmp)$/i.test(name)) {
      name += '.jpg';
    }
    return name;
  } catch {
    return 'image.jpg';
  }
}

function formatStamp(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function broadcastProgress(finished = false) {
  chrome.runtime.sendMessage({
    action: 'downloadProgress',
    ...snapshot(),
    finished
  }).catch(() => {});
}
