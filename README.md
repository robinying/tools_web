# Android Dev Tools

面向 **Android 开发** 的纯静态工具网页，部署在 **GitHub Pages**。

设计目标：公司网络**只能访问 GitHub / 微软站点**时仍可使用——**零外链 CDN**，逻辑与数据全部打进前端包，浏览器本地运行。

## 在线地址

推送到 `main` 并开启 Pages 后：

```text
https://<你的用户名>.github.io/tools_web/
```

## 已有工具

| 工具 | 说明 |
|------|------|
| **进制转换** | 2 / 8 / 10 / 16 互转 |
| **EXIF 读取** | 本地解析图片元数据 |
| **二维码生成 / 解析** | 生成 PNG；图片 / 摄像头识别 |
| **图片压缩** | 本地缩放、压缩并导出 JPEG / PNG / WebP |
| **图片加水印** | 本地添加文字或 Logo 水印并导出 |
| **dp / sp / px** | 密度单位换算 |
| **权限速查** | 常用权限说明搜索 |
| **adb 命令速查** | 常用 adb / am / pm |
| **Logcat 过滤生成** | 拼装 logcat 命令 |
| **Intent / Deep Link** | am start 与 intent:// URI |
| **Base64 / URL** | 编解码 |
| **哈希摘要** | MD5 / SHA-1 / SHA-256 |
| **颜色转换** | HEX ↔ ARGB 预览 |
| **密度与资源目录** | ldpi～xxxhdpi 对照 |
| **ProGuard 片段** | keep 规则片段库 |
| **JSON / XML 格式化** | 格式化与压缩 |
| **证书信息** | PEM 指纹（本地） |

## 本地开发

```bash
npm install
npm run dev
```

```bash
npm run build    # 产出 dist/
npm run preview  # 预览构建结果
```

## 测试

```bash
npm test                 # 单元测试（进制 / EXIF / 密度公式 / 数据表）
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
# 另开终端（需本机已安装 agent-browser）
npm run test:e2e         # 浏览器冒烟：首页与 4 个工具页交互
```

GitHub 项目站默认 `base` 为 `/tools_web/`（与仓库名一致）。若仓库改名或使用 `username.github.io` 根站，构建时设置：

```bash
GITHUB_PAGES_BASE=/ npm run build
```

## 部署（GitHub Pages）

1. 将本仓库推送到 GitHub（公开仓库）
2. **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**
3. 推送 `main` 或手动运行 workflow **Deploy to GitHub Pages**
4. 等待 Actions 成功后访问 `https://<user>.github.io/tools_web/`

工作流：`.github/workflows/deploy-pages.yml`  
构建后会扫描 `dist/`，禁止出现常见 CDN 外链。

## 内网约束自检

构建后本地检查：

```bash
npm run build
# macOS / Linux
grep -R -n -E 'https?://(cdn\.|unpkg\.|jsdelivr|googleapis|gstatic)' dist || echo "OK"
```

浏览器 DevTools → Network：应只有 `*.github.io`（或 localhost）请求。

## 技术栈

- Vue 3 + Vite + TypeScript
- Vue Router（**Hash 模式**，适配 Pages 子路径）
- [exifr](https://github.com/MikeKovarik/exifr)（打包进 bundle，无运行时外链）

## 目录

```text
src/
  components/     # 布局与卡片
  data/           # 静态数据（权限 / adb / ProGuard 等）
  views/tools/    # 各工具页
  utils/          # 进制转换等纯函数
.github/workflows/deploy-pages.yml
```

## 许可

按需自行补充。工具仅供开发辅助，数据以官方文档为准。
