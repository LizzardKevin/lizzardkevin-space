这轮先停下加功能，在独立分支上分别检查 repo hygiene、SPACE runtime 和 content/devlog 数据。能确定的低风险问题直接修了：root ignore 不再误伤 `apps/web/tests/release`，placement cache 去掉时间戳，Blender 脚本补跨平台 PATH 查找，GitHub bootstrap 不再默认推已有 origin；Focus 图片/视频页会暂停隐藏模型 Canvas，scene exhibit clone 卸载时释放自有 material，mobile / daily resume 的 localStorage 访问也能安全降级。README、DevStories 维护说明和 DevLog 7 的过期描述一并更新。

另外新增 DevLog 8 完整版和 summary，把网页端 DevStories 1 到 8 条改成第一人称记录。SPACE 当前的严重性能问题只做记录，下一轮再单独判断主开销来自 UABB、展品模型、投影图片、后处理还是主场景。本轮通过 targeted contracts、`npm run verify:quick` 和 `npm run build:chunks`，没有 push，也没有做 GitHub Pages 迁移。
