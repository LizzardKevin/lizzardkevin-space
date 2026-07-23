# DevLog_6（跨平台协作 · 全局 Cursor · space_main 资产管线）

时间：2026-06-17 ~ 2026-06-22（DevLog_5 之后的桌面网页内容、跨平台开发与主空间模型管线）

## 本次目标

这轮先补桌面端的 LizzardKevin 个人页和 DevStories，让网站除了空间体验，也能直接阅读个人档案。cursor、Pointer Lock、Overlay 退出和第一人称恢复收进同一套桌面交互，不再让各页面各管一段鼠标逻辑。

开发环境要同时覆盖本机 macOS 和 Windows Codex，并约定仓库冲突时以哪边为事实源。`space_main.blend` / `space_main.glb` 也继续往 Blender 源文件里收：出生点、朝向、楼梯、碰撞、LED emissive 和材质分层都在资产侧处理，不靠网页运行时临时补。每轮关键改动后照常跑 lint、TypeScript、build、GLB 节点检查，再用 Vite 做人工视觉 QA。

## 已完成产出

### 1) LizzardKevin 个人页和 DevStories

- 个人页不再只是简单占位，桌面内容按个人简历来组织：
  - 学生阶段：Pratt 本科、Columbia University 研究生。
  - 建筑职业阶段：三年建筑实践经历。
  - 摄影、乐队、二次元和其它个人表达。
  - 身份称谓围绕 AI 创意设计师、空间设计师、摄影师、贝斯手等展开。
- DevStories 页面按后续持续追加日志的方式整理：
  - 使用现有 Frosted Split 的页面语言，不新增路由，也不弹新窗口。
  - 右侧 DevStories 继续用 index + stage + detail 的方式查看每条日志。
- 内容不只记 changelog，也会写清楚“做成了什么”和“哪里卡住了/为什么回退”。
- 将 `docs/devlog/DevLog_1~5.md` 和 `DevLogSum_1~5.md` 重新理解后包装进 `apps/web/src/content/devStories.ts`。
- 第五轮之后的内容继续沿用同一数据结构，后续新增日志只需要：
  - 增加 `docs/devlog/DevLog_N.md`
  - 增加 `docs/devlog/DevLogSum_N.md`
  - 在 `devStories.ts` 追加一条 story 数据。

### 2) 全局自定义 Cursor 和 Pointer Lock 恢复

- 桌面端建立统一自定义 cursor 层，覆盖 SPACE、LizzardKevin、DevStories 和 Focus Overlay。
- 默认 cursor 为圆点，并根据交互状态变化：
  - hover：圆点放大和轻微发光。
  - click pulse：点击扩散。
  - text：正文/可选文字上 morph 成竖线。
  - scroll：只在可滚动区域确实有滚动价值时出现方向粒子。
  - dragReady / dragging：Focus 模型区域变成八角星，模拟抓点。
  - returning：从当前位置 500ms 曲线返回画面中心，再恢复第一人称。
- 入口白屏单独处理 cursor tone：
  - 白底上使用灰色圆点，避免白色 cursor 不可见。
  - 进入 SPACE 后回到深色/浅色上下文切换逻辑。
- ESC / Alt 释放 pointer lock 后，cursor 曾经会漂移：
  - 早期方案从中心开始用 `movementX/Y` 推算 cursor，但系统鼠标真实位置仍在旧坐标，下一次释放时会跳变。
  - 后来改为在释放 pointer lock 时，让自定义圆点从中心动画飞向真实 OS 鼠标位置。
  - 动画途中如果鼠标继续移动，目标点会更新，避免飞到旧坐标后再跳一下。
- Alt 临时释放鼠标逻辑进入第一人称：
  - 按住 Alt 释放 pointer lock，显示自定义 cursor。
  - 松开 Alt 且没有进入 Overlay / Focus 时，cursor 回中心并恢复 pointer lock。
  - 如果按住 Alt 后进入 LizzardKevin 或 DevStories，松开 Alt 不自动回锁。
- Overlay 的“双击空白退出”提示从正文滚动流里移到固定安全区，并放宽可双击返回区域，减少误操作。

### 3) 入口、彩蛋和第一人称反馈

- 入口白屏保留点击提示：
  - 点击空白区域会让标题文字 pulse。
  - pulse 结束后停留在略微放大的状态。
  - 放大取消最大上限，形成“别点空白，点文字”的渐进提示。
- 空白页连续点击彩蛋：
  - 第 20 次点击提示“这么着急吗，倒是点击文字呀”。
  - 第 100 次点击提示“按钮都这么大了还不点吗？”。
  - 提示为灰色小字，跟随鼠标 5 秒。
  - 触发只发生在第 20 / 第 100 次，不再是超过阈值后每次点击都触发。
- 第一人称跳跃彩蛋继续保留：
  - 默认禁跳。
  - 第一次按空格提示“在展厅要保持安静，不允许跳跃”。
  - 第 20 次按空格提示“真拿你没办法～”，并解锁 0.4m 跳跃。
  - 起跳/落地声音从现有脚步声文件派生，音量比脚步略大。
  - 跳跃时间缩短到原有 80%。
- 检查并修正第一人称移动手感：
  - 发现本地/远端切换后走路速度需要重新核对。
  - 当前 `PlayerController` 使用更直接的桌面速度配置，并继续保留 smoothstep 加减速。

### 4) 跨平台开发和 Git 事实源

- Windows Codex 侧新增 cross-platform development 分支，包含：
  - `.gitattributes`
  - `.nvmrc`
  - cross-platform docs
  - package / lockfile 更新
  - contract test 脚本兼容调整
- macOS 本机 fetch 后确认：
  - 远端 `codex/cross-platform-dev` 只领先一个提交。
  - 改动集中在配置、文档、lockfile 和脚本，没有碰 Blender 源文件、主 GLB 或出生点源码。
- 用户在 GitHub 合并 cross-platform PR 后，本机执行：
  - fetch
  - rebase 本地 `fix: align gallery spawn marker` 到最新 `origin/main`
  - npm install
  - lint / TypeScript / build
  - 重启 Vite 给人工检查。
- `npm install` 在当前 Node `v26.0.0` 下出现 engine warning：
  - `.nvmrc` 要求 `24.11.0`
  - package engine 要求 `>=24.11.0 <25`
  - 安装未失败，但 lockfile 出现 npm 版本造成的 metadata 漂移。
- 处理策略：
  - 还原无意义的 `package-lock.json` 漂移。
  - 后续跨平台开发以 `.nvmrc` 指定 Node 24.11.0 为准。
- 远端后来又出现模型更新提交，此时确认“本机是最新事实源”：
  - 本地提交模型和材质改动。
  - 使用 `git push --force-with-lease origin main` 让远端 `main` 对齐本机。
  - 这一步明确是用户指定的工作流，不是默认的多人协作策略。

### 5) `space_main` 出生点、朝向和 GLB revision

- 用户在 Blender 中放置 Plain Axes Empty，作为新的出生点。
- 批处理将该 Empty 改为规范名称：
  - `spawn_player_main`
  - 旋转归零。
  - 自定义 extras 标记：
    - `lk_marker: spawn`
    - `lk_forward_blender: -Y`
    - `lk_view_pitch: level`
- 网页运行时同步调整：
  - `galleryConfig.ts` 的 fallback spawn 更新到新 marker 附近。
  - `GALLERY_GLB_REVISION` 更新，避免浏览器继续吃旧模型缓存。
  - 初始视线不再看固定世界坐标，而是从 resolved spawn 朝固定方向看。
  - Blender global `-Y` 在 Y-up GLB / Three.js 中对应 `+Z`，因此初始 look direction 使用 `[0, 0, 1]`。
- `resolveGallerySpawn.ts` 增加 fallback：
  - 如果 marker 下方没有 `COL_floor` / `COL_ground` / `COL_platform`，则使用 `spawn_player_main` 自身高度作为脚下高度。
  - 这样用户在 Blender 里放置的 Empty 不会只贡献 XZ，避免角色掉到模型下方。
- 导出后验证：
  - GLB 内存在唯一 `spawn_player_main`。
  - runtime 解析出生点约为 `[-0.510, 37.758, -48.318]`。
  - 初始视线平视朝 Blender `-Y`。

### 6) 改用 Blender Python Console

- 原本准备使用 Blender MCP 批量调整模型，但碰到：
  - MCP 返回 `Incomplete JSON response received`。
  - 直接 socket 到 Blender 端口超时。
  - 插件通路不稳定，不适合作为本阶段资产批处理的主流程。
- 后来改用 Blender Python Console：
  - 通过 Computer Use 聚焦 Blender。
  - 使用 Python Console 执行批处理脚本。
  - 每次输出 `/tmp/lk_blender_*.json` 报告，方便终端复查。
- 这套方式完成了多轮资产操作：
  - 批量识别 401 个 mesh。
  - 将 `COL_*` 放入 `COLLISION_HELPERS`，设为透明红、wire、show in front、hide render。
  - 按前缀给 `ARCH_*`、`GLASS_*`、`METAL_ALUMINUM_*`、`LIGHT_GENERIC_*` 等重新赋材质。
  - 保存 `BlenderFile/space_main.blend`。
  - 导出覆盖 `apps/web/public/models/space_main.glb`。
- 用户明确要求后续 Blender 批处理都直接使用 Python Console，这条作为当前项目工作习惯保留。

### 7) 楼梯和 LED emissive

- 网页检查发现楼梯在 SPACE 里不正常：
  - 视觉上像只有透明碰撞体。
  - 导出的 GLB 里只有 `COL_STAIR_*`，没有对应的 `struct_stair_*` / `STRUCT_STAIR_*` 视觉楼梯节点。
  - 运行时代码会隐藏 `COL_*` 节点，因此不能靠显示碰撞体解决。
- 批处理修复策略：
  - 保留 `COL_STAIR_*` 作为碰撞源。
  - 从每个 `COL_STAIR_*` 复制生成对应 `STRUCT_STAIR_*` 可见 mesh。
  - 给 `STRUCT_STAIR_*` 赋 `mat_stair_warm_concrete`。
  - 将可见楼梯放入 `VIS_STAIRS` collection。
- 本轮生成：
  - `69` 个 `STRUCT_STAIR_*` 可见楼梯。
  - `69` 个 `COL_STAIR_*` 碰撞楼梯继续保留。
- `LIGHT_GENERIC_LIGHT_*` 初始材质仍是 dark metal，不会表现为发光 LED。
- 批处理将 `55` 个 `LIGHT_GENERIC_LIGHT_*` 改为：
  - `mat_led_generic_warm_emissive`
  - base color warm yellow
  - emissive factor warm yellow
  - `KHR_materials_emissive_strength: 3.5`
- 最终 GLB 检查：
  - `nodeCount: 471`
  - `meshCount: 470`
  - `materialCount: 8`
  - `visibleStairCount: 69`
  - `collisionStairCount: 69`
  - `genericLightCount: 55`
  - `spawnNames: ["spawn_player_main"]`

## 遇到的问题与处理

| 问题 | 处理 |
|------|------|
| Blender MCP 不稳定，无法可靠执行批量操作 | 改用 Blender Python Console，脚本输出 JSON report，之后资产批处理默认走 Console |
| 重新导入 GLB 后出现 `spawn_player_main` 和 `spawn_player_main.001` | 批处理保留最新导入的 marker，删除重复旧 marker，并恢复唯一 `spawn_player_main` |
| 新模型没有可走地板碰撞节点时，出生点 Y 会 fallback 到 0 附近 | `resolveGallerySpawn` 在 marker 下找不到地板时使用 marker 自身高度 |
| Blender -Y 和 Three.js 初始视线方向容易混淆 | 明确记录 Blender global `-Y` 导出到 Y-up GLB 后对应 Three `+Z`，并用 direction 而不是固定 lookAt 坐标 |
| 楼梯只有 `COL_STAIR_*`，运行时又隐藏 `COL_*`，导致网页端楼梯不可见 | 从碰撞楼梯生成 `STRUCT_STAIR_*` 可见 mesh，碰撞和视觉分离 |
| `LIGHT_GENERIC_LIGHT_*` 使用 dark metal 材质，不发光 | 批量改为 emissive LED 材质，并在 GLB 内验证 emissive strength |
| Node v26 执行 `npm install` 会触发 engine warning 和 lockfile metadata 漂移 | 以 `.nvmrc` 的 Node 24.11.0 为项目版本，恢复不必要的 lockfile 改动 |
| 远端 main 和本机 main 分叉，且用户确认本机为最新事实源 | 使用 `git push --force-with-lease origin main`，让远端安全对齐本机 |
| in-app Browser 仍不适合完整 WebGPU / Pointer Lock 视觉 QA | 继续以 terminal contract + build + 用户真实浏览器手测结合 |

## 当前验证状态

关键步骤中多次执行了：

```text
npm run lint
npm exec -w apps/web tsc -- --noEmit -p tsconfig.app.json
npm run build
find apps/web/dist apps/web/public/models -type f -size +20M -print
```

- lint：通过。
- TypeScript：通过。
- build：通过。
- `space_main.glb` 体积约 2.8 MB，没有超过 20 MB。
- GLB 节点检查通过：
  - 唯一 `spawn_player_main`。
  - 69 个可见楼梯。
  - 69 个楼梯碰撞体。
  - 55 个 emissive generic LED。
  - 8 个最终材质，导入时的临时 Material 噪声已清理。
- Vite dev server 已重启到 `http://127.0.0.1:5173/`，接下来人工检查楼梯、LED、出生点和移动手感。

## 下一步计划

1. 在 Chrome 中检查楼梯是否可见、LED 是否足够亮、碰撞是否仍能正常上楼。
2. 决定 emissive mesh 只做视觉，还是让 `LIGHT_GENERIC_LIGHT_*` 同时驱动运行时 point light / area light。
3. 将 `STRUCT_STAIR_*` 写回命名文档，明确楼梯视觉和碰撞双节点规则。
4. macOS 和 Windows 都切到 `.nvmrc` 指定 Node 24.11.0，减少 lockfile 差异。
5. 在 `space_main.blend` 内增加正式 `exhibit_*` hit mesh，让 Focus 不再依赖 demo 资产。

## 相关文件索引

- 主空间 Blender：`BlenderFile/space_main.blend`
- 主空间 GLB：`apps/web/public/models/space_main.glb`
- 出生点解析：`apps/web/src/scenes/gallery/resolveGallerySpawn.ts`
- 主空间配置：`apps/web/src/scenes/gallery/galleryConfig.ts`
- 第一人称控制：`apps/web/src/scenes/Player/PlayerController.tsx`
- Cursor 系统：`apps/web/src/cursor/SpaceCursorOverlay.tsx`
- DevStories 数据：`apps/web/src/content/devStories.ts`
- DevStories 页面：`apps/web/src/pages/DevStoriesPage.tsx`
- Frosted Split：`apps/web/src/components/frostedSplit/FrostedSplitTabs.tsx`
- 手机端入口：`apps/web/src/pages/MobileExperience.tsx`
- 跨平台文档：`docs/cross-platform-development.md`
