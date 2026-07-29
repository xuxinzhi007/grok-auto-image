# Release Notes

## v1.1.0

### 新功能

- 自动多轮滚动，尽量加载懒加载图片
- 下载进度条与取消
- 下载完成系统通知（关闭弹窗后仍可感知）
- 按时间戳保存到 `grok_images/YYYYMMDD_HHMM/`

### 安全与稳定性

- 后台仅允许 `https://assets.grok.com` 下载
- 文件名非法字符清理
- content script 注入重试与 `runtime.lastError` 处理
- 避免全 DOM `getComputedStyle` 造成卡顿

### 上架 / 开源

- 补齐 16/32/48/128 图标
- MIT License、隐私政策、贡献与安全说明

## v1.0.0

- 初版：在 `grok.com/files` 提取并批量下载图片
