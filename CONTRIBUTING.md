# 贡献指南

感谢关注本项目。欢迎通过 Issue 与 Pull Request 参与改进。

## 开发环境

1. Clone 本仓库
2. Chrome/Edge → 扩展管理 → 开发者模式 →「加载已解压的扩展程序」→ 选择仓库根目录
3. 修改代码后，在扩展页点击「重新加载」，再刷新 `grok.com/files` 页面测试

本项目为原生 Manifest V3 扩展，无构建步骤。主要文件：

- `manifest.json` — 扩展清单
- `content.js` — 页面提取与滚动加载
- `background.js` — 下载任务与校验
- `popup.html` / `popup.js` — 弹窗 UI

## 提交建议

- 一个 PR 聚焦一件事（修 bug / 新功能 / 文档）
- 说明动机与测试方式（浏览器版本、是否在 `grok.com/files` 验证）
- 不要提交 `.crx`、`.pem`、个人下载目录内容或密钥

## Issue

请尽量提供：

- 浏览器与版本
- 扩展版本（见 `manifest.json` 的 `version`）
- 复现步骤与期望行为
- 若相关：扩展或页面控制台报错

## 行为准则

请保持友善、就事论事。不接受骚扰、恶意破坏或明显违规用途相关的贡献。
