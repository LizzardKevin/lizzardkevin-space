# DevStories（开发日志）内容入口

目前 `DevStories` 页面是占位。内容在本地维护，构建后随静态站部署到 Cloudflare Pages。

## 本地 Markdown（推荐）

- 在 [`docs/devlog/`](devlog/) 编写开发日志（如 `DevLog_1.md`）
- 后续可在 `apps/web` 增加列表/详情页，从 Markdown 或构建时生成的 JSON 读取

## 可选：应用内 MDX

- 在 `apps/web/src/content/dev-stories/*.mdx` 放文章
- Vite 构建时用 mdx-bundler 或 Contentlayer 生成列表与详情

本文件作为维护入口说明，避免忘记内容来源。
