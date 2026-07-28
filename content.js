// 提取页面中的所有图片链接
function extractImageUrls() {
    const urls = [];
    const seen = new Set();

    console.log('🔍 开始提取图片链接...');

    // 方法1: 从 img 标签提取
    document.querySelectorAll('img').forEach(img => {
        let src = img.src || img.getAttribute('data-src') || '';
        if (src.includes('assets.grok.com') &&
            (src.includes('.jpg') || src.includes('.png') || src.includes('.jpeg'))) {
            src = src.split('?')[0];
            if (!seen.has(src)) {
                seen.add(src);
                urls.push(src);
                console.log('  ✅ 从 img 标签找到:', src);
            }
        }
    });

    // 方法2: 从 background-image 样式提取
    document.querySelectorAll('*').forEach(el => {
        const style = getComputedStyle(el);
        const bg = style.backgroundImage;
        if (bg && bg.includes('assets.grok.com')) {
            const match = bg.match(/url\(["']?([^"']+)["']?\)/);
            if (match) {
                let url = match[1].split('?')[0];
                if (url.includes('assets.grok.com') && !seen.has(url)) {
                    seen.add(url);
                    urls.push(url);
                    console.log('  ✅ 从 background-image 找到:', url);
                }
            }
        }
    });

    // 方法3: 从 data 属性提取
    document.querySelectorAll('[data-src], [data-url], [data-image]').forEach(el => {
        ['data-src', 'data-url', 'data-image'].forEach(attr => {
            const val = el.getAttribute(attr);
            if (val && val.includes('assets.grok.com') && !seen.has(val)) {
                seen.add(val);
                urls.push(val);
                console.log('  ✅ 从 data 属性找到:', val);
            }
        });
    });

    // 方法4: 从链接提取
    document.querySelectorAll('a[href*="assets.grok.com"]').forEach(a => {
        const href = a.href.split('?')[0];
        if (href.includes('assets.grok.com') && !seen.has(href)) {
            seen.add(href);
            urls.push(href);
            console.log('  ✅ 从链接找到:', href);
        }
    });

    console.log(`📊 共提取到 ${urls.length} 张图片`);
    return urls;
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getImageCount') {
        const urls = extractImageUrls();
        sendResponse({ count: urls.length });
        return true;
    }

    if (request.action === 'getImages') {
        // 先滚动到底部，加载所有内容
        window.scrollTo(0, document.body.scrollHeight);

        // 等待图片加载
        setTimeout(() => {
            const urls = extractImageUrls();
            sendResponse({ urls: urls });
        }, 1500);
        return true;
    }
});

console.log('✅ Grok 批量下载插件已加载');