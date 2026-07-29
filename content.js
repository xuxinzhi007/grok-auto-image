const ASSET_HOST = 'assets.grok.com';
const MAX_SCROLL_ROUNDS = 25;
const SCROLL_SETTLE_MS = 800;
const SCROLL_STABLE_ROUNDS = 2;

const BLOCKED_EXT = /\.(js|css|map|json|svg|woff2?|ttf|eot|mp4|webm|m3u8)(\?|$)/i;

function normalizeUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let url = raw.trim();
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return null;
  try {
    const u = new URL(url, location.href);
    if (u.protocol !== 'https:' || u.hostname !== ASSET_HOST) return null;
    if (BLOCKED_EXT.test(u.pathname)) return null;
    u.hash = '';
    // 去掉 query（CDN 参数通常不影响原图）
    if (!u.pathname || u.pathname === '/') return null;
    return `${u.origin}${u.pathname}`;
  } catch {
    return null;
  }
}

function addUrl(urls, seen, raw) {
  const url = normalizeUrl(raw);
  if (!url || seen.has(url)) return;
  seen.add(url);
  urls.push(url);
}

function extractImageUrls() {
  const urls = [];
  const seen = new Set();

  document.querySelectorAll('img').forEach((img) => {
    addUrl(urls, seen, img.currentSrc || img.src);
    addUrl(urls, seen, img.getAttribute('data-src'));
    addUrl(urls, seen, img.getAttribute('data-lazy-src'));
    addUrl(urls, seen, img.getAttribute('srcset')?.split(',')[0]?.trim()?.split(/\s+/)[0]);
  });

  document.querySelectorAll('source[srcset], img[srcset]').forEach((el) => {
    const srcset = el.getAttribute('srcset') || '';
    srcset.split(',').forEach((part) => {
      addUrl(urls, seen, part.trim().split(/\s+/)[0]);
    });
  });

  // 仅扫描带 inline background 或常见媒体容器，避免全 DOM getComputedStyle
  const bgCandidates = document.querySelectorAll(
    '[style*="background"], [class*="image"], [class*="Image"], [class*="media"], [class*="Media"], [class*="thumb"], [class*="Thumb"]'
  );
  bgCandidates.forEach((el) => {
    const inline = el.style?.backgroundImage || '';
    if (inline && inline.includes(ASSET_HOST)) {
      const match = inline.match(/url\(["']?([^"')]+)["']?\)/i);
      if (match) addUrl(urls, seen, match[1]);
    }
  });

  document.querySelectorAll('[data-src], [data-url], [data-image], [data-original]').forEach((el) => {
    ['data-src', 'data-url', 'data-image', 'data-original'].forEach((attr) => {
      addUrl(urls, seen, el.getAttribute(attr));
    });
  });

  document.querySelectorAll(`a[href*="${ASSET_HOST}"]`).forEach((a) => {
    addUrl(urls, seen, a.href);
  });

  // 从 HTML 中兜底抓取 assets.grok.com 直链（应对虚拟列表未挂载完整 src 的情况）
  const html = document.documentElement.innerHTML;
  const re = /https:\/\/assets\.grok\.com\/[^"'\\\s<>]+/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    addUrl(urls, seen, m[0].replace(/&amp;/g, '&'));
  }

  return urls;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getScrollRoot() {
  const candidates = [
    document.scrollingElement,
    document.documentElement,
    document.body,
    ...Array.from(document.querySelectorAll('main, [role="main"], [class*="scroll"], [class*="Scroll"], [class*="list"], [class*="List"]'))
  ].filter(Boolean);

  let best = document.scrollingElement || document.documentElement;
  let bestDelta = 0;
  for (const el of candidates) {
    const delta = (el.scrollHeight || 0) - (el.clientHeight || 0);
    if (delta > bestDelta) {
      bestDelta = delta;
      best = el;
    }
  }
  return best;
}

async function loadAllByScrolling(onProgress) {
  const root = getScrollRoot();
  let stable = 0;
  let lastCount = 0;
  let lastHeight = 0;

  for (let round = 0; round < MAX_SCROLL_ROUNDS; round++) {
    root.scrollTo({ top: root.scrollHeight, behavior: 'auto' });
    window.scrollTo(0, document.body.scrollHeight);
    await sleep(SCROLL_SETTLE_MS);

    const urls = extractImageUrls();
    const height = root.scrollHeight || document.body.scrollHeight;
    if (onProgress) onProgress({ round: round + 1, count: urls.length });

    if (urls.length === lastCount && height <= lastHeight) {
      stable++;
      if (stable >= SCROLL_STABLE_ROUNDS) break;
    } else {
      stable = 0;
    }
    lastCount = urls.length;
    lastHeight = height;
  }

  // 回到顶部，便于用户继续浏览
  root.scrollTo({ top: 0, behavior: 'auto' });
  return extractImageUrls();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getImageCount') {
    try {
      const urls = extractImageUrls();
      sendResponse({ count: urls.length, ok: true });
    } catch (e) {
      sendResponse({ count: 0, ok: false, error: e.message });
    }
    return false;
  }

  if (request.action === 'getImages') {
    (async () => {
      try {
        const urls = await loadAllByScrolling();
        sendResponse({ urls, ok: true });
      } catch (e) {
        sendResponse({ urls: [], ok: false, error: e.message });
      }
    })();
    return true;
  }
});
