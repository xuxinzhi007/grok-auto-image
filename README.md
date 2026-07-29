# Grok 批量下载图片

Chrome / Edge Manifest V3 扩展：在 [grok.com/files](https://grok.com/files) 自动滚动加载并批量下载 `assets.grok.com` 图片。

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

本扩展不收集、不上传任何用户数据。

## Chrome 网上应用店上架清单

- [x] Manifest V3
- [x] 16 / 32 / 48 / 128 图标
- [x] 权限最小化与用途说明（见上）
- [ ] 准备商店截图（弹窗 + files 页面）
- [ ] 准备隐私政策 URL（可写明「仅本地下载，无服务器」）
- [ ] 打包：Chrome 扩展页 →「打包扩展程序」，或上传 ZIP（根目录含 `manifest.json`，勿含 `.git`）

打包 ZIP 示例（PowerShell）：

```powershell
Compress-Archive -Path manifest.json,background.js,content.js,popup.html,popup.js,icons -DestinationPath grok-auto-image-1.1.0.zip -Force
```

## 目录结构

```
manifest.json
background.js      # 下载任务、校验、通知
content.js         # 页面提取与自动滚动
popup.html / js    # 弹窗 UI
icons/             # 扩展图标
```

## 版本

- `1.1.0` — 生产向优化：滚动加载、进度/取消、URL 白名单、通知、图标
- `1.0` — 初版 MVP
