# Grok 批量下载图片

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-1.1.0-brightgreen.svg)](./manifest.json)

在 [grok.com/files](https://grok.com/files) **勾选下载或一键批量下载**你生成的图片。支持 Chrome / Edge。

> **说明：** 本扩展为第三方开源工具，与 xAI / Grok 官方无关。请遵守 grok.com 服务条款，仅下载你有权保存的内容。

## 能做什么

- 支持下载你在页面上**勾选**的文件
- 也可一键下载全部（自动滚动加载更多图片）
- 多张图片会**打包成 1 个 ZIP** 一次性下载
- 使用浏览器**侧边栏**操作，点页面不会收起
- 下载进度显示，支持中途取消
- 下载过程中可保持侧边栏打开，完成后有系统通知
- 图片保存在浏览器「下载」目录下的 `grok_images/` 文件夹

## 安装

1. 打开 [Releases](https://github.com/xuxinzhi007/grok-auto-image/releases)，下载最新的 `grok-auto-image-*.zip` 并解压  
   （也可以直接 clone / 下载本仓库）
2. 浏览器打开扩展管理页  
   - Chrome：`chrome://extensions`  
   - Edge：`edge://extensions`
3. 打开右上角「开发者模式」
4. 点击「加载已解压的扩展程序」，选择**解压后的文件夹**（里面要有 `manifest.json`）
5. 点击工具栏图标，会在**右侧打开侧边栏**（点页面也不会收起）

## 怎么用

1. 打开并登录 [https://grok.com/files](https://grok.com/files)
2. 在列表里勾选要下载的文件（可选）
3. 点击扩展图标打开右侧边栏
4. 看「已勾选」数量  
   - 点 **下载已选**：只下勾选的  
   - 点 **下载全部**：滚动加载后下全部
5. 等待下载完成；需要时可点「取消」

下载的文件默认在系统「下载」文件夹中的 `grok_images` 目录。

## 常见问题

**弹窗一点别处就没了？**  
请重新加载扩展后，点图标打开的是**侧边栏**，可以一边勾选一边操作。

**「下载已选」是灰的 / 已勾选为 0？**  
请先在页面勾选文件；侧边栏会自动刷新数量。若仍为 0，刷新 files 页面后再试。

**下载到哪里了？**  
看浏览器下载栏，或打开系统「下载」目录里的 `grok_images` 文件夹。

**会上传我的数据吗？**  
不会。图片只保存在你的电脑，不经过本扩展的任何服务器。详见 [隐私政策](./PRIVACY.md)。

## 反馈

遇到问题或有建议，欢迎到 [Issues](https://github.com/xuxinzhi007/grok-auto-image/issues) 反馈。

## License

[MIT](./LICENSE) © 2026 xinzhi.xu
