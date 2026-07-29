const ALLOWED_HOST = 'assets.grok.com';
const DOWNLOAD_DELAY_MS = 400;
const FOLDER = 'grok_images';

/** @type {{ running: boolean, cancel: boolean, cancelled: boolean, total: number, done: number, failed: number, skipped: number }} */
let job = {
  running: false,
  cancel: false,
  cancelled: false,
  total: 0,
  done: 0,
  failed: 0,
  skipped: 0
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

function snapshot() {
  return {
    running: job.running,
    total: job.total,
    done: job.done,
    failed: job.failed,
    skipped: job.skipped,
    cancel: job.cancel,
    cancelled: job.cancelled
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
    skipped
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
  runDownloadLoop(valid).catch((e) => {
    console.warn('[grok-dl] job crashed:', e);
    job.running = false;
    broadcastProgress(true);
  });

  return { success: true, started: true, total: valid.length, skipped };
}

async function runDownloadLoop(valid) {
  const stamp = formatStamp(new Date());

  for (let i = 0; i < valid.length; i++) {
    if (job.cancel) {
      job.cancelled = true;
      break;
    }

    const url = valid[i];
    const padded = String(i + 1).padStart(3, '0');
    const filename = `${FOLDER}/${stamp}/${padded}_${getFileName(url)}`;

    try {
      await chrome.downloads.download({
        url,
        filename,
        conflictAction: 'uniquify',
        saveAs: false
      });
      job.done++;
    } catch (e) {
      job.failed++;
      console.warn('[grok-dl] download failed:', filename, e);
    }

    broadcastProgress();

    if (i < valid.length - 1 && !job.cancel) {
      await sleep(DOWNLOAD_DELAY_MS);
    }
  }

  if (job.cancel) job.cancelled = true;
  job.running = false;
  job.cancel = false;
  broadcastProgress(true);

  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: job.cancelled ? '下载已取消' : 'Grok 图片下载完成',
      message: job.cancelled
        ? `已下载 ${job.done}/${job.total} 张后取消`
        : `成功 ${job.done} 张，失败 ${job.failed} 张`
    });
  } catch (_) {}
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
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

function broadcastProgress(finished = false) {
  chrome.runtime.sendMessage({
    action: 'downloadProgress',
    ...snapshot(),
    finished
  }).catch(() => {});
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
