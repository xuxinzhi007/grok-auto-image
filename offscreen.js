chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.action !== 'offscreenDownloadZip') return;

  (async () => {
    try {
      const bytes = msg.buffer
        ? new Uint8Array(msg.buffer)
        : new Uint8Array(msg.bytes || []);
      const blob = new Blob([bytes], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const downloadId = await chrome.downloads.download({
        url,
        filename: msg.filename || 'grok_images.zip',
        conflictAction: 'uniquify',
        saveAs: false
      });
      setTimeout(() => URL.revokeObjectURL(url), 120000);
      sendResponse({ ok: true, downloadId });
    } catch (e) {
      sendResponse({ ok: false, error: e.message || String(e) });
    }
  })();

  return true;
});
