function setStatus(el, text, type = '') {
  el.textContent = text || '';
  el.className = type;
}

function phaseLabel(st) {
  const done = st.done || 0;
  const total = st.total || 0;
  if (st.phase === 'fetch') return `拉取图片 ${done}/${total}`;
  if (st.phase === 'pack') return '正在打包 ZIP…';
  if (st.phase === 'save') return '保存 ZIP…';
  if (st.running) return `处理中 ${done}/${total}`;
  return `${done} / ${total}`;
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

function applyFinishedUi(ui, msg) {
  const { status, downloadBtn, downloadSelectedBtn, cancelBtn, progressWrap, progressBar, progressText, progressPct } = ui;
  cancelBtn.classList.remove('visible');
  downloadBtn.disabled = false;
  downloadSelectedBtn.disabled = Number(ui.selectedCountEl.textContent || 0) <= 0;
  downloadBtn.textContent = '下载全部';
  downloadSelectedBtn.textContent = '下载已选';

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
    setStatus(status, `完成：已打包 ${msg.done} 张到 1 个 ZIP${msg.failed ? `（失败 ${msg.failed}）` : ''}`, 'success');
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

async function getFilesTab() {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active?.id && active.url && /^https:\/\/(www\.)?grok\.com\/files/i.test(active.url)) {
    return active;
  }
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs.find((t) => t.url && /^https:\/\/(www\.)?grok\.com\/files/i.test(t.url)) || null;
}

document.addEventListener('DOMContentLoaded', async () => {
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const status = document.getElementById('status');
  const countEl = document.getElementById('count');
  const selectedCountEl = document.getElementById('selectedCount');
  const progressWrap = document.getElementById('progressWrap');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressPct = document.getElementById('progressPct');
  const openFiles = document.getElementById('openFiles');
  const ui = {
    status,
    downloadBtn,
    downloadSelectedBtn,
    cancelBtn,
    progressWrap,
    progressBar,
    progressText,
    progressPct,
    selectedCountEl
  };

  let pollTimer = null;
  let countTimer = null;
  let busy = false;
  let tabId = null;

  const stopPoll = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const setBusy = (value) => {
    busy = value;
    if (value) {
      downloadBtn.disabled = true;
      downloadSelectedBtn.disabled = true;
    } else {
      downloadBtn.disabled = false;
      downloadSelectedBtn.disabled = Number(selectedCountEl.textContent || 0) <= 0;
    }
  };

  const updateCounts = (response) => {
    const total = response?.count || 0;
    const selected = response?.selectedCount || 0;
    countEl.textContent = String(total);
    selectedCountEl.textContent = String(selected);
    if (!busy) {
      downloadSelectedBtn.disabled = selected <= 0;
    }
    return { total, selected, selectedUrlCount: response?.selectedUrlCount || 0 };
  };

  const refreshFromPage = async () => {
    const tab = await getFilesTab();
    if (!tab?.id) {
      tabId = null;
      countEl.textContent = '0';
      selectedCountEl.textContent = '0';
      if (!busy) {
        downloadBtn.disabled = true;
        downloadSelectedBtn.disabled = true;
        setStatus(status, '请打开 grok.com/files 后再使用', 'error');
      }
      return null;
    }

    tabId = tab.id;
    if (!busy) {
      downloadBtn.disabled = false;
    }

    try {
      const response = await ensureContentScript(tabId);
      const counts = updateCounts(response);
      if (!busy) {
        if (counts.selected > 0 && counts.selectedUrlCount === 0) {
          setStatus(status, `检测到已选 ${counts.selected} 项，正在匹配图片链接…可再点一次「下载已选」`, 'warn');
        } else if (counts.selected > 0) {
          setStatus(status, `已检测到 ${counts.selected} 项勾选，可下载已选。`, '');
        } else if (!counts.total) {
          setStatus(status, '未检测到图片。可先勾选文件，或点「下载全部」。', 'warn');
        } else {
          setStatus(status, '在页面勾选文件后，可点「下载已选」。', '');
        }
      }
      return counts;
    } catch (e) {
      if (!busy) setStatus(status, e.message || '读取页面失败', 'error');
      return null;
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
            phaseLabel(st)
          );
        } else {
          stopPoll();
          setBusy(false);
          applyFinishedUi(ui, st);
          refreshFromPage();
        }
      } catch (_) {}
    }, 400);
  };

  const startDownload = async (urls, modeLabel) => {
    cancelBtn.classList.add('visible');
    showProgress(progressWrap, progressBar, progressText, progressPct, 0, urls.length, `拉取图片 0 / ${urls.length}`);
    setStatus(status, `${modeLabel} ${urls.length} 张，将打包成 1 个 ZIP 下载。`, '');

    const reply = await runtimeSend({ action: 'downloadAll', urls });
    if (!reply?.started) {
      setBusy(false);
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
  };

  openFiles.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://grok.com/files' });
  });

  await refreshFromPage();

  countTimer = setInterval(() => {
    if (!busy) refreshFromPage();
  }, 1000);

  chrome.tabs.onActivated.addListener(() => {
    if (!busy) refreshFromPage();
  });
  chrome.tabs.onUpdated.addListener((id, info) => {
    if (info.status === 'complete' && !busy) refreshFromPage();
  });

  try {
    const st = await runtimeSend({ action: 'getDownloadStatus' });
    if (st?.running) {
      setBusy(true);
      cancelBtn.classList.add('visible');
      showProgress(progressWrap, progressBar, progressText, progressPct, st.done, st.total, phaseLabel(st));
      setStatus(status, '下载进行中…', 'warn');
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
        phaseLabel(msg)
      );
      cancelBtn.classList.add('visible');
      setBusy(true);
    }
    if (msg.finished) {
      stopPoll();
      setBusy(false);
      applyFinishedUi(ui, msg);
      refreshFromPage();
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

  downloadSelectedBtn.addEventListener('click', async () => {
    setBusy(true);
    downloadSelectedBtn.textContent = '读取勾选…';
    setStatus(status, '正在读取页面勾选的图片…', '');
    hideProgress(progressWrap);
    cancelBtn.classList.remove('visible');
    stopPoll();

    try {
      const tab = await getFilesTab();
      if (!tab?.id) throw new Error('请先打开 grok.com/files');
      tabId = tab.id;

      await ensureContentScript(tabId);
      const response = await chrome.tabs.sendMessage(tabId, { action: 'getSelectedImages' });
      const err = chrome.runtime.lastError;
      if (err) throw new Error(err.message);

      const urls = response?.urls || [];
      const selectedCount = response?.selectedCount || urls.length;
      selectedCountEl.textContent = String(selectedCount);

      if (!urls.length) {
        const hint = response?.pageSelected
          ? `页面显示已选 ${response.pageSelected}，但还没匹配到图片链接。请刷新 files 页面后重试。`
          : '没有识别到勾选图片。请确认已勾选文件后再试。';
        setStatus(status, hint, 'error');
        downloadSelectedBtn.textContent = '下载已选';
        setBusy(false);
        return;
      }

      downloadSelectedBtn.textContent = '下载中…';
      await startDownload(urls, '已选');
    } catch (e) {
      stopPoll();
      setStatus(status, `错误：${e.message}`, 'error');
      downloadSelectedBtn.textContent = '下载已选';
      setBusy(false);
      cancelBtn.classList.remove('visible');
    }
  });

  downloadBtn.addEventListener('click', async () => {
    setBusy(true);
    downloadBtn.textContent = '滚动加载中…';
    setStatus(status, '正在自动滚动并收集图片…', '');
    hideProgress(progressWrap);
    cancelBtn.classList.remove('visible');
    stopPoll();

    try {
      const tab = await getFilesTab();
      if (!tab?.id) throw new Error('请先打开 grok.com/files');
      tabId = tab.id;

      await ensureContentScript(tabId);
      const response = await chrome.tabs.sendMessage(tabId, { action: 'getImages' });
      const err = chrome.runtime.lastError;
      if (err) throw new Error(err.message);

      const urls = response?.urls || [];
      countEl.textContent = String(urls.length);

      if (!urls.length) {
        setStatus(status, '没有找到图片链接，请确认页面已加载出图片。', 'error');
        downloadBtn.textContent = '下载全部';
        setBusy(false);
        return;
      }

      downloadBtn.textContent = '下载中…';
      await startDownload(urls, '共');
    } catch (e) {
      stopPoll();
      setStatus(status, `错误：${e.message}`, 'error');
      downloadBtn.textContent = '下载全部';
      setBusy(false);
      cancelBtn.classList.remove('visible');
    }
  });

  window.addEventListener('unload', () => {
    stopPoll();
    if (countTimer) clearInterval(countTimer);
  });
});
