function setStatus(el, text, type = '') {
  el.textContent = text || '';
  el.className = type;
}

function showProgress(wrap, bar, textEl, pctEl, done, total, label) {
  wrap.classList.add('visible');
  wrap.setAttribute('aria-hidden', 'false');
  const safeTotal = Math.max(total, 1);
  const pct = Math.min(100, Math.round((done / safeTotal) * 100));
  bar.style.width = `${pct}%`;
  bar.parentElement.setAttribute('aria-valuenow', String(pct));
  pctEl.textContent = `${pct}%`;
  textEl.textContent = label || `${done} / ${total}`;
}

function hideProgress(wrap) {
  wrap.classList.remove('visible');
  wrap.setAttribute('aria-hidden', 'true');
}

function runtimeSend(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (reply) => {
      const err = chrome.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve(reply);
    });
  });
}

function applyFinishedUi({ status, btn, cancelBtn, progressWrap, progressBar, progressText, progressPct }, msg) {
  cancelBtn.classList.remove('visible');
  btn.disabled = false;
  btn.textContent = '下载全部';

  const parts = [`成功 ${msg.done || 0}`];
  if (msg.failed) parts.push(`失败 ${msg.failed}`);
  if (msg.skipped) parts.push(`跳过 ${msg.skipped}`);

  if (msg.total) {
    showProgress(
      progressWrap,
      progressBar,
      progressText,
      progressPct,
      msg.done || 0,
      msg.total,
      `${msg.done || 0} / ${msg.total}`
    );
  }

  if (msg.cancelled) {
    setStatus(status, `已取消（${parts.join('，')}）`, 'warn');
  } else if ((msg.done || 0) > 0) {
    setStatus(status, `完成：${parts.join('，')}`, 'success');
  } else {
    setStatus(status, msg.error || '没有成功下载任何图片', 'error');
  }
}

async function ensureContentScript(tabId) {
  try {
    const res = await chrome.tabs.sendMessage(tabId, { action: 'getImageCount' });
    if (res && typeof res.count === 'number') return res;
  } catch (_) {}

  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js']
  });

  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 120));
    try {
      const res = await chrome.tabs.sendMessage(tabId, { action: 'getImageCount' });
      if (res && typeof res.count === 'number') return res;
    } catch (_) {}
  }
  throw new Error('无法连接页面脚本，请刷新页面后重试');
}

document.addEventListener('DOMContentLoaded', async () => {
  const btn = document.getElementById('downloadBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const status = document.getElementById('status');
  const countEl = document.getElementById('count');
  const progressWrap = document.getElementById('progressWrap');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressPct = document.getElementById('progressPct');
  const openFiles = document.getElementById('openFiles');
  const ui = { status, btn, cancelBtn, progressWrap, progressBar, progressText, progressPct };

  let pollTimer = null;

  const stopPoll = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const startPoll = () => {
    stopPoll();
    pollTimer = setInterval(async () => {
      try {
        const st = await runtimeSend({ action: 'getDownloadStatus' });
        if (!st) return;
        if (st.running) {
          showProgress(
            progressWrap,
            progressBar,
            progressText,
            progressPct,
            st.done,
            st.total,
            `下载中 ${st.done}/${st.total}`
          );
        } else {
          stopPoll();
          applyFinishedUi(ui, st);
        }
      } catch (_) {
        // SW 休眠时忽略，下一轮再试
      }
    }, 400);
  };

  openFiles.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://grok.com/files' });
  });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || !/^https:\/\/(www\.)?grok\.com\/files/i.test(tab.url)) {
    setStatus(status, '请在 grok.com/files 页面使用本扩展', 'error');
    btn.disabled = true;
    return;
  }

  try {
    const response = await ensureContentScript(tab.id);
    countEl.textContent = String(response.count || 0);
    if (!response.count) {
      setStatus(status, '未检测到图片。可先手动滚动加载，或直接点下载自动滚动。', 'warn');
    }
  } catch (e) {
    setStatus(status, e.message || '初始化失败', 'error');
    btn.disabled = true;
    return;
  }

  try {
    const st = await runtimeSend({ action: 'getDownloadStatus' });
    if (st?.running) {
      btn.disabled = true;
      cancelBtn.classList.add('visible');
      showProgress(progressWrap, progressBar, progressText, progressPct, st.done, st.total, `下载中 ${st.done}/${st.total}`);
      setStatus(status, '下载进行中…关闭弹窗也会继续。', 'warn');
      startPoll();
    }
  } catch (_) {}

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action !== 'downloadProgress') return;
    if (msg.running && !msg.finished) {
      showProgress(
        progressWrap,
        progressBar,
        progressText,
        progressPct,
        msg.done,
        msg.total,
        `下载中 ${msg.done}/${msg.total}`
      );
      cancelBtn.classList.add('visible');
      btn.disabled = true;
    }
    if (msg.finished) {
      stopPoll();
      applyFinishedUi(ui, msg);
    }
  });

  cancelBtn.addEventListener('click', async () => {
    cancelBtn.disabled = true;
    try {
      await runtimeSend({ action: 'cancelDownload' });
      setStatus(status, '正在取消…', 'warn');
    } catch (e) {
      setStatus(status, e.message, 'error');
    } finally {
      cancelBtn.disabled = false;
    }
  });

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = '滚动加载中…';
    setStatus(status, '正在自动滚动并收集图片…', '');
    hideProgress(progressWrap);
    cancelBtn.classList.remove('visible');
    stopPoll();

    try {
      await ensureContentScript(tab.id);
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getImages' });
      const err = chrome.runtime.lastError;
      if (err) throw new Error(err.message);

      const urls = response?.urls || [];
      countEl.textContent = String(urls.length);

      if (!urls.length) {
        setStatus(status, '没有找到图片链接，请确认页面已加载出图片。', 'error');
        btn.textContent = '下载全部';
        btn.disabled = false;
        return;
      }

      btn.textContent = '下载中…';
      cancelBtn.classList.add('visible');
      showProgress(progressWrap, progressBar, progressText, progressPct, 0, urls.length, `0 / ${urls.length}`);
      setStatus(status, `找到 ${urls.length} 张，开始下载…关闭弹窗也会继续。`, '');

      const reply = await runtimeSend({ action: 'downloadAll', urls });
      if (!reply?.started) {
        applyFinishedUi(ui, {
          done: 0,
          failed: 0,
          skipped: reply?.skipped || 0,
          total: 0,
          cancelled: false,
          error: reply?.error || '无法启动下载'
        });
        return;
      }

      startPoll();
    } catch (e) {
      stopPoll();
      setStatus(status, `错误：${e.message}`, 'error');
      btn.textContent = '下载全部';
      btn.disabled = false;
      cancelBtn.classList.remove('visible');
    }
  });
});
