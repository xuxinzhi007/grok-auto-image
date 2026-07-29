# Release Notes

## v1.1.0

### 新功能

- 支持下载页面勾选的文件（「下载已选」），也可「下载全部」
- 多张图片打包为 **1 个 ZIP** 一次性下载（避免下载栏刷屏）
- 自动多轮滚动，尽量加载懒加载图片
- 下载进度条与取消
- 下载完成系统通知（关闭弹窗后仍可感知）
- 侧边栏常驻操作，点页面不收起
- ZIP 保存到 `grok_images/grok_images_时间戳.zip`

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
