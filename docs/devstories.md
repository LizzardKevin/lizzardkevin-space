# DevStories（开发日志）内容入口

目前 `DevStories` 页面是占位。后续会按两种方式之一实现内容：

## 方式 A：用 Sanity（推荐）

- 使用 `devLogPost` schema
- 页面拉取列表与详情（可用 GROQ + 预构建 `content.json`）

## 方式 B：本地 MDX（轻量）

- 在 `apps/web/src/content/dev-stories/*.mdx` 放文章
- Vite 构建时用内容层（Contentlayer / mdx-bundler）生成列表与详情

本文件先作为“入口说明”，避免你忘记该内容从哪里维护。

