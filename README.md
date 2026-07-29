# Grok 批量下载图片

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Manifest](https://img.shields.io/badge/Manifest-V3-blue.svg)](./manifest.json)
[![Version](https://img.shields.io/badge/version-1.1.0-brightgreen.svg)](./manifest.json)

Chrome / Edge **Manifest V3** 开源扩展：在 [grok.com/files](https://grok.com/files) 自动滚动加载，并批量下载 `assets.grok.com` 图片。

> **免责声明：** 本项目为第三方工具，与 xAI / Grok 无关。请遵守 grok.com 服务条款与当地法律，仅下载你有权保存的内容。使用风险自负。

## 功能

- 自动多轮滚动，尽量加载懒加载图片
- 从 `img` / `srcset` / `data-*` / 链接 / 页面 HTML 多策略提取直链
- 仅允许下载 `https://assets.grok.com/...`（后台二次校验）
- 顺序下载 + 间隔，降低限流风险
- 进度条、取消、完成后系统通知
- 按时间戳分子目录：`下载目录/grok_images/YYYYMMDD_HHMM/`

## 安装（开发者模式）

1. 打开 Chrome：`chrome://extensions`（Edge：`edge://extensions`）
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本仓库根目录（包含 `manifest.json` 的文件夹）
5. 打开 https://grok.com/files ，点击工具栏图标使用

也可从 [GitHub Releases](https://github.com/xuxinzhi007/grok-auto-image/releases) 下载发布包 ZIP，解压后按同样方式加载。

## 使用说明

1. 进入 `grok.com/files` 并登录（如需）
2. 打开扩展弹窗，确认检测到图片数量
3. 点击「下载全部」——会先自动滚动收集，再开始下载
4. 可随时点「取消」中止后续文件（已发起的下载仍由浏览器完成）
5. 关闭弹窗不会中断下载；完成后会弹出通知

## 权限说明

| 权限 | 用途 |
|------|------|
| `activeTab` / `scripting` | 在当前 Grok 页面注入/通信内容脚本 |
| `downloads` | 批量保存图片到本机下载目录 |
| `notifications` | 下载结束提醒（弹窗已关闭时仍可知晓） |
| `https://grok.com/*` | 与 files 页面交互 |
| `https://assets.grok.com/*` | 下载图片资源 |

本扩展**不收集、不上传**任何用户数据。详见 [PRIVACY.md](./PRIVACY.md)。

## 打包发布 ZIP

```powershell
Compress-Archive -Path manifest.json,background.js,content.js,popup.html,popup.js,icons,LICENSE,README.md,PRIVACY.md -DestinationPath grok-auto-image-1.1.0.zip -Force
```

上传到 GitHub Release 或 Chrome 网上应用店时，ZIP 根目录需直接包含 `manifest.json`（不要多包一层文件夹，勿含 `.git` / `.pem`）。

## Chrome 网上应用店

- [x] Manifest V3
- [x] 16 / 32 / 48 / 128 图标
- [x] 权限说明与 [隐私政策](./PRIVACY.md)
- [ ] 商店截图（弹窗 + files 页面）
- [ ] 开发者账号注册与审核提交

隐私政策可使用本仓库中 `PRIVACY.md` 的 GitHub 页面链接（需先 push 到公开仓库）。

## 目录结构

```
manifest.json
background.js      # 下载任务、校验、通知
content.js         # 页面提取与自动滚动
popup.html / js    # 弹窗 UI
icons/             # 扩展图标
LICENSE            # MIT
PRIVACY.md         # 隐私政策
CONTRIBUTING.md    # 贡献指南
SECURITY.md        # 安全披露
RELEASE_NOTES.md   # 版本说明
```

## 贡献

欢迎提 Issue / PR，请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。安全问题见 [SECURITY.md](./SECURITY.md)。

## 版本

详见 [RELEASE_NOTES.md](./RELEASE_NOTES.md)。

- `1.1.0` — 生产向优化：滚动加载、进度/取消、URL 白名单、通知、开源文档
- `1.0.0` — 初版 MVP

## License

[MIT](./LICENSE) © 2026 xinzhi.xu
