# DevStories（开发日志）内容入口

`DevStories` 现在已经是桌面端 Frosted Split 里的正式页面，不再是占位。内容仍然在本地维护，网页端数据由展品工作簿生成，Markdown 长日志单独保存。

## 当前内容来源

- 网页端内容源：[`docs/assets/space-exhibit-index.xlsx`](assets/space-exhibit-index.xlsx) 的 `explore` sheet（`entry_kind=dev_story`）
- 网页端生成数据：[`apps/web/src/generated/devStories.generated.ts`](../apps/web/src/generated/devStories.generated.ts)
- 完整开发日志：[`docs/devlog/DevLog_*.md`](devlog/)
- 摘要版本：[`docs/devlog/DevLogSum_*.md`](devlog/)

网页端不会在构建时自动读取 Markdown；新增日志时需要同时新增 Markdown，并在工作簿中追加对应的 `dev_story` 行。生成文件不手改，由内容脚本从工作簿统一生成。

## 更新流程

1. 在 `docs/devlog/` 新增完整版 `DevLog_N.md` 和摘要版 `DevLogSum_N.md`。
2. 在 `docs/assets/space-exhibit-index.xlsx` 的 `explore` sheet 追加对应 `devlog-NN` 数据。
3. 运行 `npm run content:generate`，再运行 `npm run content:check` 和 `npm run verify:quick`。
4. 如果改到路由、构建入口或资源路径，再运行 `npm run build:chunks`。

构建后内容会随静态站部署到 GitHub Pages；不要提交本地 `dist/`、`release/` 或 `work/` 产物。
