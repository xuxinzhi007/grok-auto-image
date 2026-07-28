// 监听下载请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'downloadAll') {
        downloadAll(request.urls, sendResponse);
        return true;
    }
});

// 批量下载
async function downloadAll(urls, sendResponse) {
    let successCount = 0;

    console.log(`📥 开始下载 ${urls.length} 张图片...`);

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const padded = String(i + 1).padStart(3, '0');
        const filename = 'grok_images/' + padded + '_' + getFileName(url);

        try {
            await chrome.downloads.download({
                url: url,
                filename: filename,
                conflictAction: 'uniquify'
            });
            successCount++;
            console.log(`  ✅ 已下载: ${filename}`);

            // 间隔 500ms，防止触发限流
            await sleep(500);
        } catch (e) {
            console.error(`  ❌ 下载失败: ${filename}`, e);
        }
    }

    console.log(`🎉 下载完成！成功 ${successCount}/${urls.length} 张`);
    sendResponse({ success: true, count: successCount, total: urls.length });
}

// 从 URL 提取文件名
function getFileName(url) {
    const parts = url.split('/');
    let name = parts[parts.length - 1];
    if (!name.includes('.')) {
        name = name + '.jpg';
    }
    return name;
}

// 延迟函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

console.log('✅ 后台服务已启动');