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
    if (!u.pathname || u.pathname === '/') return null;
    return `${u.origin}${u.pathname}`;
  } catch {
    return null;
  }
}

function addUrl(urls, seen, raw) {
  const url = normalizeUrl(raw);
  if (!url || seen.has(url)) return false;
  seen.add(url);
  urls.push(url);
  return true;
}

function queryDeep(selector, root = document) {
  const out = [];
  const visit = (node) => {
    if (!node) return;
    try {
      if (node.querySelectorAll) {
        node.querySelectorAll(selector).forEach((el) => out.push(el));
      }
    } catch (_) {}
    const children = node.querySelectorAll ? node.querySelectorAll('*') : [];
    for (const el of children) {
      if (el.shadowRoot) visit(el.shadowRoot);
    }
  };
  visit(root);
  return out;
}

function collectUrlsFromRoot(root, urls, seen) {
  if (!root) return;

  const scope = root instanceof Element || root === document.documentElement ? root : null;
  if (!scope) return;

  if (scope.matches?.('img')) {
    addUrl(urls, seen, scope.currentSrc || scope.src);
  }

  const imgs = scope.querySelectorAll ? scope.querySelectorAll('img') : [];
  imgs.forEach((img) => {
    addUrl(urls, seen, img.currentSrc || img.src);
    addUrl(urls, seen, img.getAttribute('data-src'));
    addUrl(urls, seen, img.getAttribute('data-lazy-src'));
    const srcset = img.getAttribute('srcset');
    if (srcset) addUrl(urls, seen, srcset.split(',')[0]?.trim()?.split(/\s+/)[0]);
  });

  scope.querySelectorAll?.(`a[href*="${ASSET_HOST}"]`).forEach((a) => {
    addUrl(urls, seen, a.href);
  });

  scope.querySelectorAll?.('[data-src], [data-url], [data-image], [data-original]').forEach((el) => {
    ['data-src', 'data-url', 'data-image', 'data-original'].forEach((attr) => {
      addUrl(urls, seen, el.getAttribute(attr));
    });
  });

  const html = scope.innerHTML || '';
  if (html.includes(ASSET_HOST)) {
    const re = /https:\/\/assets\.grok\.com\/[^"'\\\s<>]+/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      addUrl(urls, seen, m[0].replace(/&amp;/g, '&'));
    }
  }
}

function extractImageUrls() {
  const urls = [];
  const seen = new Set();
  collectUrlsFromRoot(document.documentElement, urls, seen);

  queryDeep('source[srcset], img[srcset]').forEach((el) => {
    const srcset = el.getAttribute('srcset') || '';
    srcset.split(',').forEach((part) => {
      addUrl(urls, seen, part.trim().split(/\s+/)[0]);
    });
  });

  document.querySelectorAll(
    '[style*="background"], [class*="image"], [class*="Image"], [class*="media"], [class*="Media"], [class*="thumb"], [class*="Thumb"]'
  ).forEach((el) => {
    const inline = el.style?.backgroundImage || '';
    if (inline && inline.includes(ASSET_HOST)) {
      const match = inline.match(/url\(["']?([^"')]+)["']?\)/i);
      if (match) addUrl(urls, seen, match[1]);
    }
  });

  return urls;
}

function isCheckedControl(el) {
  if (!(el instanceof Element)) return false;
  if (el.matches('input[type="checkbox"]')) return el.checked;
  const aria = el.getAttribute('aria-checked');
  if (aria === 'true') return true;
  if (el.getAttribute('data-state') === 'checked') return true;
  if (el.getAttribute('data-checked') === 'true') return true;
  // 视觉勾选：常见自定义 checkbox 内有 check SVG / 勾选图标
  if (el.getAttribute('aria-pressed') === 'true') return true;
  return false;
}

function isSelectAllControl(el) {
  if (!el) return false;
  const label = `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.textContent || ''}`.toLowerCase();
  if (/全选|select all|selectall/.test(label)) return true;
  if (el.closest('thead, [role="columnheader"]')) return true;
  // 工具条「已选择 N」附近的全选，通常同一行没有文件缩略图
  const bar = el.closest('header, [class*="toolbar" i], [class*="Toolbar"]');
  if (bar && !bar.querySelector(`img[src*="${ASSET_HOST}"]`)) return true;
  return false;
}

function findRowForAssetImg(img) {
  let node = img;
  let best = img.parentElement;
  for (let i = 0; i < 14 && node; i++) {
    const checks = node.querySelectorAll?.(
      'input[type="checkbox"], [role="checkbox"], [aria-checked], [data-state], button, [role="button"]'
    );
    if (checks && checks.length) {
      best = node;
      // 再往上一点通常是整行；若继续扩大仍只有一张资产图，优先更大行
      const parent = node.parentElement;
      if (parent) {
        const assetImgs = parent.querySelectorAll?.(`img[src*="${ASSET_HOST}"], img[srcset*="${ASSET_HOST}"]`) || [];
        if (assetImgs.length === 1) best = parent;
      }
      break;
    }
    node = node.parentElement;
  }
  return best;
}

function rowLooksSelected(row) {
  if (!row) return false;

  const controls = row.querySelectorAll(
    'input[type="checkbox"], [role="checkbox"], [aria-checked], [data-state], [data-checked], [aria-pressed]'
  );
  for (const el of controls) {
    if (isSelectAllControl(el)) continue;
    if (isCheckedControl(el)) return true;
  }

  // 无标准属性时：勾选框区域内有 check 路径 / 实心方块类名
  if (row.querySelector('[class*="checked" i]:not(img), [class*="Checked"]:not(img)')) {
    const maybe = row.querySelector('input[type="checkbox"], [role="checkbox"], button, svg');
    if (maybe && !isSelectAllControl(maybe)) return true;
  }

  if (row.getAttribute('aria-selected') === 'true') return true;
  if (row.getAttribute('data-selected') === 'true') return true;

  return false;
}

function extractSelectedImageUrls() {
  const urls = [];
  const seen = new Set();
  const selectedRows = new Set();

  // 主策略：从资产图反查所在行，再判断该行是否勾选（比从 checkbox 找行更稳）
  const imgs = queryDeep(`img[src*="${ASSET_HOST}"], img[srcset*="${ASSET_HOST}"]`);
  imgs.forEach((img) => {
    const row = findRowForAssetImg(img);
    if (row && rowLooksSelected(row)) {
      selectedRows.add(row);
      collectUrlsFromRoot(row, urls, seen);
    }
  });

  // 补充：直接找已勾选控件再扩行
  if (!urls.length) {
    const checked = [
      ...queryDeep('input[type="checkbox"]:checked'),
      ...queryDeep('[role="checkbox"][aria-checked="true"]'),
      ...queryDeep('[aria-checked="true"]'),
      ...queryDeep('[data-state="checked"]'),
      ...queryDeep('[data-checked="true"]')
    ].filter((el) => !isSelectAllControl(el));

    checked.forEach((el) => {
      let node = el;
      for (let i = 0; i < 12 && node; i++) {
        if (node.querySelector?.(`img[src*="${ASSET_HOST}"], img[srcset*="${ASSET_HOST}"]`)) {
          selectedRows.add(node);
          collectUrlsFromRoot(node, urls, seen);
          break;
        }
        node = node.parentElement;
      }
    });
  }

  return {
    urls,
    selectedItemCount: Math.max(selectedRows.size, urls.length)
  };
}

function getPageSelectionHint() {
  const text = document.body?.innerText || '';
  const m = text.match(/已选择\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

function getSelectionSummary() {
  const extracted = extractSelectedImageUrls();
  const pageSelected = getPageSelectionHint();
  const selectedCount = Math.max(
    extracted.selectedItemCount || 0,
    extracted.urls.length || 0,
    pageSelected || 0
  );
  return {
    urls: extracted.urls,
    selectedCount,
    selectedItemCount: extracted.selectedItemCount,
    pageSelected,
    urlCount: extracted.urls.length
  };
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

  root.scrollTo({ top: 0, behavior: 'auto' });
  return extractImageUrls();
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getImageCount') {
    try {
      const urls = extractImageUrls();
      const sel = getSelectionSummary();
      sendResponse({
        count: urls.length,
        selectedCount: sel.selectedCount,
        selectedUrlCount: sel.urlCount,
        pageSelected: sel.pageSelected,
        ok: true
      });
    } catch (e) {
      sendResponse({ count: 0, selectedCount: 0, ok: false, error: e.message });
    }
    return false;
  }

  if (request.action === 'getSelectedImages') {
    try {
      const sel = getSelectionSummary();
      sendResponse({
        urls: sel.urls,
        selectedCount: sel.selectedCount,
        selectedUrlCount: sel.urlCount,
        pageSelected: sel.pageSelected,
        ok: true
      });
    } catch (e) {
      sendResponse({ urls: [], ok: false, error: e.message });
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
