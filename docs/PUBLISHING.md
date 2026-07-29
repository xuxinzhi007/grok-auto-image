# 发布与维护说明（给维护者）

面向仓库维护者 / 开发者。普通用户请看 [README.md](./README.md)。

## 目录结构

```
manifest.json
background.js      # 下载任务、校验、通知
content.js         # 页面提取与自动滚动
popup.html / js    # 弹窗 UI
icons/             # 扩展图标
LICENSE            # MIT
PRIVACY.md         # 隐私政策（商店可引用）
CONTRIBUTING.md    # 贡献指南
SECURITY.md        # 安全披露
RELEASE_NOTES.md   # 版本说明
docs/PUBLISHING.md # 本文件
```

## 打包 ZIP（Release / 商店）

ZIP **根目录**必须直接包含 `manifest.json`（不要多包一层文件夹），勿含 `.git`、`.pem`、`.zip`。

推荐用脚本式打包（路径使用 `/`，兼容 GitHub 上传）：

```powershell
# 在仓库根目录执行；生成 grok-auto-image-1.1.0.zip
$ver = '1.1.0'
$zip = "grok-auto-image-$ver.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$fs = [System.IO.File]::Open((Join-Path (Get-Location) $zip), [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
$files = @(
  'manifest.json','background.js','content.js','popup.html','popup.js',
  'LICENSE','README.md','PRIVACY.md',
  'icons/icon16.png','icons/icon32.png','icons/icon48.png','icons/icon128.png'
)
foreach ($rel in $files) {
  $src = Join-Path (Get-Location) ($rel -replace '/','\')
  $entry = $archive.CreateEntry(($rel -replace '\\','/'), [System.IO.Compression.CompressionLevel]::Optimal)
  $es = $entry.Open(); $bytes = [System.IO.File]::ReadAllBytes($src); $es.Write($bytes,0,$bytes.Length); $es.Dispose()
}
$archive.Dispose(); $fs.Dispose()
```

## GitHub Release

1. 推送 tag（如 `v1.1.0`）
2. 创建 Release，粘贴 `RELEASE_NOTES.md` 中对应用户说明
3. 上传上面生成的 ZIP

## Chrome 网上应用店清单

- [x] Manifest V3
- [x] 16 / 32 / 48 / 128 图标
- [x] 权限说明与 [隐私政策](../PRIVACY.md)
- [ ] 商店截图（弹窗 + files 页面）
- [ ] 开发者账号注册与审核提交

隐私政策 URL 示例：  
https://github.com/xuxinzhi007/grok-auto-image/blob/main/PRIVACY.md

## 版本记录

见 [RELEASE_NOTES.md](../RELEASE_NOTES.md)。
