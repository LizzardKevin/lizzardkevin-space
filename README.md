# LizzardKevin Space

WebGPU 3D 展厅（React + Three.js + Rapier）。主场景 `gallery_main.glb`，展品 Focus 特写与 manifest 驱动交互。

## 开发

```bash
npm install
npm run dev          # http://127.0.0.1:5173
npm run build        # 产物 apps/web/dist
npm run package:test # 本地试玩 zip → release/
```

**浏览器**：Chrome 或 Edge（需 WebGPU）。

## 部署

1. 推送到 GitHub（见下方仓库说明）
2. [Cloudflare Pages 部署指引](docs/deploy-cloudflare-pages.md) — 免费静态托管，`*.pages.dev` 分享给测试者

## 仓库结构

| 路径 | 说明 |
|------|------|
| `apps/web/` | Vite 前端 |
| `apps/web/public/models/` | 主场景 GLB |
| `apps/web/public/exhibits/` | 展品 Focus 模型与 `content.json` |
| `docs/` | 命名规范、部署、DevLog |
| `studio/` | Sanity Studio（可选） |
