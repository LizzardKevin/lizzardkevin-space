# DevStories（开发日志）内容入口

`DevStories` 现在已经是桌面端 Frosted Split 里的正式页面，不再是占位。内容仍然在本地维护，网页端数据和 Markdown 长日志分开保存。

## 当前内容来源

- 网页端卡片数据：[`apps/web/src/content/devStories.ts`](../apps/web/src/content/devStories.ts)
- 完整开发日志：[`docs/devlog/DevLog_*.md`](devlog/)
- 摘要版本：[`docs/devlog/DevLogSum_*.md`](devlog/)

网页端不会在构建时自动读取 Markdown；新增日志时需要同步更新 `devStories.ts`，让桌面端 DevStories 列表出现同一条记录。

## 更新流程

1. 在 `docs/devlog/` 新增完整版 `DevLog_N.md` 和摘要版 `DevLogSum_N.md`。
2. 在 `apps/web/src/content/devStories.ts` 追加对应 `devlog-NN` 数据。
3. 运行 `npm run verify:quick`；如果改到路由、构建入口或资源路径，再运行 `npm run build:chunks`。

构建后内容会随静态站部署到 Cloudflare Pages；不要提交本地 `dist/`、`release/` 或 `work/` 产物。
