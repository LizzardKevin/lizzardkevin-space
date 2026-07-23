# DevLog_8（项目管理审查 · 低风险修复 · 性能问题记录）

时间：2026-07-02（DevLog_7 之后的项目管理审查、低风险修复、验证和性能问题记录）

## 本次目标

这轮先停下加功能，把 SPACE 当成一个要继续维护的项目检查一遍。范围包括 repo hygiene、脚本入口、生成产物、WebGPU/runtime 风险、内容表达和 devlog 数据结构。

低风险且能直接判断的问题当场修；会影响审美、部署策略或产品体验的部分只记录，不顺手重构。同时补最新版 devlog，把网页端 DevStories 整理成后续容易读、也容易维护的个人记录。SPACE 目前还有严重性能问题，留到下一轮单独拆查。本地 main 要保持可验证、可交接，但这轮不 push，也不做 GitHub Pages 迁移。

## 已完成产出

### 1) 项目检查和 subagent 分工

- 我先确认当前 worktree 是独立 linked worktree，起点是本地 `main` 的 `9059a8f`。
- 新建并使用分支 `codex/project-management-code-review`，没有直接在 `main` 上开发。
- 三个只读审查方向并行进行：
  - Repo hygiene / scripts / gitignore / generated assets / package scripts / verification entrypoints。
  - Frontend architecture / SPACE runtime / WebGPU compatibility / performance-sensitive patterns。
  - Content / i18n / mobile / devlog web surface / reader-facing tone。
- 低风险部分直接处理；高风险或需要审美/部署选择的内容写进交接，这轮不动。

### 2) repo hygiene 和脚本小修

- `.gitignore` 里 root 本地产物更明确：
  - `/release/`
  - `/work/`
  - `/.tmp_py/`
- 这样 `apps/web/tests/release/` 不再被 `release/` 误伤，后续可以正常新增 release 相关测试文件。
- `scripts/generate-exhibit-placement-cache.mjs` 去掉 `generatedAt`：
  - 生成的 `generated-exhibit-placement.json` 不再每次带时间戳漂移。
  - `scene-pipeline.contract-test.mjs` 加了断言，防止时间戳以后又被悄悄加回来。
- `scripts/prepare-exhibit-models.mjs` 补了 Blender 查找方式：
  - 仍支持 `BLENDER` 显式路径。
  - Windows 继续支持已知安装路径和 `where.exe blender`。
  - macOS/Linux 也能通过 `which blender` 找 PATH 上的 Blender。
- `scripts/github-bootstrap.sh` 不再在已有 `origin` 时默认 push：
  - 现在会提示手动确认。
  - 真要脚本推已有远端，需要显式传 `--push-existing`。

### 3) runtime 小修

- Focus Overlay：
  - 非模型页，也就是图片/视频页，隐藏的 WebGPU model Canvas 现在用 `frameloop="never"` 暂停渲染。
  - 回到模型页时再恢复 `frameloop="always"`。
- Scene exhibit placement：
  - 场景展品会 clone GLTF scene 和 material。
  - 现在 clone 出来的自有 material 会在组件卸载时 dispose，避免距离加载/卸载反复切换时积累 GPU material。
  - 几何和贴图仍然由 GLTF 缓存共享，没有顺手乱 dispose。
- localStorage 访问：
  - `spaceDailyResume` 的默认 `window.localStorage` 访问包进 try/catch。
  - 手机端 language/theme 偏好也改用安全读写 helper。
  - 隐私模式或 storage 被禁用时，SPACE 和手机 terminal 会继续运行，不会因为偏好存储失败而中断。

### 4) 对齐文档和维护入口

- README 里的主场景从旧 `gallery_main.glb` 更新为当前 `space_main.glb`。
- README 增加 `npm run verify:quick` 作为日常开发验证入口。
- `docs/devstories.md` 从“占位说明”改成当前真实维护说明：
  - 完整日志在 `docs/devlog/DevLog_*.md`。
  - 摘要在 `docs/devlog/DevLogSum_*.md`。
  - 网页端数据在 `apps/web/src/content/devStories.ts`。
  - Markdown 不会自动生成网页数据，新增日志要两边同步。
- DevLog 7 里过期的 `GalleryFloorCollider`、旧脚本路径和旧验证描述也顺手修正到当前结构。

### 5) 整理 DevStories，记录性能问题

- 我保留了 `DevStory` 原有数据结构：
  - `id`
  - `number`
  - `period`
  - `title`
  - `summary`
  - `built`
  - `trouble`
  - `next`
  - `tags`
- 没有引入 MDX、生成脚本或新的孤立格式。
- 网页端 1 到 8 条 DevStories 改成第一人称的个人记录：
  - 标题更口语。
  - summary 改成第一人称。
  - detail 里保留技术信息，但少用冷冰冰的任务清单口吻。
- DevLog 8 的最新部分不再把“修改日志表达”当成主要事件，而是把项目收口和当前严重性能问题写清楚。
- Frosted Split 里的 DevStories 标签也一起改了：
  - `Built` 改成 `What I tuned`
  - `Trouble / Rollback` 改成 `What got weird`
  - `Next` 改成 `Next note`
  - 面板说明从 `process ledger` 改成更像 personal build diary。
- 新增 `apps/web/tests/frosted-split/devstories-content.contract-test.mjs`，锁住 DevLog 8、维护入口和这些更暖的标签。

## 遇到的问题与处理

| 问题 | 处理 |
|------|------|
| 第一轮 verify 失败，因为新 worktree 没有安装依赖 | 先在 repo root 执行 `npm install`，确认 Node 24.11.0 / npm 11.6.1，然后重跑验证 |
| `.gitignore` 的 `release/` 会误伤 `apps/web/tests/release` | 改成 root `/release/`，并保留 `dist` / `node_modules` 的广义忽略，避免构建产物进 status |
| placement cache 每次生成都带时间戳 | 去掉 `generatedAt`，并在 scene pipeline contract 里断言不能再出现 |
| Focus 图片/视频页仍挂着模型 Canvas | 只在模型页保持 `frameloop="always"`，其它媒体页暂停渲染 |
| scene exhibit clone 的 material 没有卸载清理 | 增加 `disposeSceneExhibitMaterials`，只清理本组件 clone 出来的 material |
| storage 访问可能被隐私环境拦截 | 默认 storage 和手机端偏好读写都加安全 helper |
| DevStories 如果只改数据，UI 标签仍像 ledger | 同时调整 `splitArchiveData.ts` 的标签和描述，并加 contract test |
| SPACE 现在遇到严重性能问题 | 本轮只记录，不顺手掺进低风险收口；后续需要单独判断主开销来自 UABB、展品模型、投影图片、后处理还是主场景 |
| 大 source GLB/JPG 仍在 public 下会被部署 | 记录为后续部署/资产策略问题，本轮不搬动，避免牵动脚本、测试和部署路径 |

## 当前验证状态

这轮执行了：

```text
node scripts/prepare-exhibit-models.mjs --help
node scripts/validate-exhibit-scene-assets.mjs --json
node apps/web/tests/exhibits/scene-pipeline.contract-test.mjs
node apps/web/tests/space/movement-debug.contract-test.mjs
node --test apps/web/tests/space/space-daily-resume.test.mjs
node apps/web/tests/focus/media-layout.contract-test.mjs
node apps/web/tests/mobile/shell-routing.contract-test.mjs
node apps/web/tests/frosted-split/devstories-content.contract-test.mjs
npm run verify:quick
npm run build:chunks
```

- targeted script/runtime/content contracts：通过。
- `npm run verify:quick`：通过。
- `npm run build:chunks`：通过。
- `apps/web/dist` 是本地 build 产物，仍然被忽略，没有提交。
- 本轮没有 push。

## 下一步计划

1. GitHub Pages / github.io 迁移另开线程。迁移前先确认 Vite base path、SPA fallback、public 静态资源路径和 GitHub Pages 的仓库/域名策略。
2. `*.source.glb` 和 projector `source/*.jpg` 目前在 `public` 下，会被原样部署。是否移出 public、放 LFS、CDN 或保留，需要单独决定。
3. `回到 space` 在英文模式下是否保留品牌感，属于产品表达选择，这轮没有改。
4. 桌面入口和 scene exhibit placement 仍有 manifest 重复加载的空间，要不要抽缓存还需评估。
5. Markdown 和网页数据目前手动双写。日志继续变多时再考虑生成脚本，这轮先维持现状。

## 相关文件索引

- 完整日志：`docs/devlog/DevLog_8.md`
- 摘要日志：`docs/devlog/DevLogSum_8.md`
- 网页 DevStories 数据：`apps/web/src/content/devStories.ts`
- DevStories 面板数据转换：`apps/web/src/components/frostedSplit/splitArchiveData.ts`
- DevStories 内容 contract：`apps/web/tests/frosted-split/devstories-content.contract-test.mjs`
- 维护入口说明：`docs/devstories.md`
- gitignore：`.gitignore`
- placement cache 脚本：`scripts/generate-exhibit-placement-cache.mjs`
- Blender 展品脚本：`scripts/prepare-exhibit-models.mjs`
- GitHub bootstrap：`scripts/github-bootstrap.sh`
- Focus Overlay：`apps/web/src/exhibits/FocusOverlay.tsx`
- scene exhibit placement：`apps/web/src/scenes/exhibits/SceneExhibitPlacement.tsx`
- SPACE daily resume：`apps/web/src/space/spaceDailyResume.ts`
- 手机端入口：`apps/web/src/pages/MobileExperience.tsx`
