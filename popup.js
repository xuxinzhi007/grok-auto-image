document.addEventListener('DOMContentLoaded', async () => {
    const btn = document.getElementById('downloadBtn');
    const status = document.getElementById('status');
    const countEl = document.getElementById('count');

    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 检查是否在 grok.com/files 页面
    if (!tab.url || !tab.url.includes('grok.com/files')) {
        status.textContent = '⚠️ 请在 grok.com/files 页面使用';
        status.className = 'error';
        btn.disabled = true;
        return;
    }

    // 获取图片数量
    try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getImageCount' });
        countEl.textContent = response?.count || 0;
        if (response?.count === 0) {
            status.textContent = '⚠️ 未找到图片，请滚动加载全部';
            status.className = 'error';
            btn.disabled = true;
        }
    } catch (e) {
        // content script 未加载，重新注入
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });
        setTimeout(async () => {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getImageCount' });
            countEl.textContent = response?.count || 0;
        }, 500);
    }

    // 点击下载
    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = '⏳ 获取图片中...';
        status.textContent = '';
        status.className = '';

        try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getImages' });

            if (!response || response.urls.length === 0) {
                status.textContent = '⚠️ 没有找到图片链接';
                status.className = 'error';
                btn.textContent = '⬇️ 下载全部图片';
                btn.disabled = false;
                return;
            }

            status.textContent = `📥 找到 ${response.urls.length} 张图片，开始下载...`;

            chrome.runtime.sendMessage({
                action: 'downloadAll',
                urls: response.urls
            }, (reply) => {
                if (reply?.success) {
                    status.textContent = `✅ 已下载 ${reply.count} 张图片！`;
                    status.className = 'success';
                } else {
                    status.textContent = `❌ ${reply?.error || '下载失败'}`;
                    status.className = 'error';
                }
                btn.textContent = '⬇️ 下载全部图片';
                btn.disabled = false;
            });

        } catch (e) {
            status.textContent = `❌ 错误: ${e.message}`;
            status.className = 'error';
            btn.textContent = '⬇️ 下载全部图片';
            btn.disabled = false;
        }
    });
});