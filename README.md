# Grok 批量下载图片

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-1.1.0-brightgreen.svg)](./manifest.json)

在 [grok.com/files](https://grok.com/files) **一键批量下载**你生成的图片。支持 Chrome / Edge。

> **说明：** 本扩展为第三方开源工具，与 xAI / Grok 官方无关。请遵守 grok.com 服务条款，仅下载你有权保存的内容。

## 能做什么

- 自动滚动页面，尽量加载出更多图片
- 一键批量下载到电脑
- 下载进度显示，支持中途取消
- 关闭弹窗后仍会继续下载，完成后有系统通知
- 图片保存在浏览器「下载」目录下的 `grok_images/日期时间/` 文件夹

## 安装

1. 打开 [Releases](https://github.com/xuxinzhi007/grok-auto-image/releases)，下载最新的 `grok-auto-image-*.zip` 并解压  
   （也可以直接 clone / 下载本仓库）
2. 浏览器打开扩展管理页  
   - Chrome：`chrome://extensions`  
   - Edge：`edge://extensions`
3. 打开右上角「开发者模式」
4. 点击「加载已解压的扩展程序」，选择**解压后的文件夹**（里面要有 `manifest.json`）
5. 安装完成，工具栏会出现扩展图标

## 怎么用

1. 打开并登录 [https://grok.com/files](https://grok.com/files)
2. 点击浏览器工具栏上的本扩展图标
3. 确认弹窗里显示的图片数量
4. 点击「下载全部」
5. 等待下载完成；需要时可点「取消」

下载的文件默认在系统「下载」文件夹中的 `grok_images` 目录。

## 常见问题

**弹窗提示请在 grok.com/files 使用？**  
请先打开 files 页面，再点扩展图标。

**显示 0 张图片？**  
可先在页面上手动往下滚一会儿，或直接点「下载全部」（扩展会自动滚动加载）。

**下载到哪里了？**  
看浏览器下载栏，或打开系统「下载」目录里的 `grok_images` 文件夹。

**会上传我的数据吗？**  
不会。图片只保存在你的电脑，不经过本扩展的任何服务器。详见 [隐私政策](./PRIVACY.md)。

## 反馈

遇到问题或有建议，欢迎到 [Issues](https://github.com/xuxinzhi007/grok-auto-image/issues) 反馈。

## License

[MIT](./LICENSE) © 2026 xinzhi.xu
