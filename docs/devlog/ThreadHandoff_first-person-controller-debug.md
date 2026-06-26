# Thread Handoff: first-person-controller-debug

时间：2026-06-25  
分支：`codex/first-person-controller-debug`  
本地 Vite：`http://127.0.0.1:5174/`

## 交接摘要

这个 thread 主要围绕 SPACE 第一人称控制、指针锁异常、Focus 展品界面、展品资产清理和 dev debug 能力做了一轮较大的串联修改。当前分支仍是一个工作分支，包含大量未提交改动；其中 `BlenderFile/space_main.blend1` 已经是工作区既有修改，未在本轮主动处理，不要误删或回滚。

当前最重要的状态：

- 第一人称指针锁已经从原始 Drei `PointerLockControls` 切到 guarded pointer lock controls，并对异常鼠标 delta 做过滤。
- SPACE debug 面板已增强：显示 mesh、exhibit、pos、speed、ratio、look、look delta、contact，并在最新改动里新增实时 `fps / frame ms`。
- demo box / demo bass 已从 manifest、内容、媒体和前端合同中移除。
- Focus 图片体验经过多轮调整：圆角、hover 轻浮动、点击放大、模糊暗背景、禁用放大态切图、按视口约 60% 面积放大、保持原图比例不裁切、进入展品后 eager preload 全部图片。
- Tree Habitat 的 focus/model 材质有调整：model white 更白，model glass 更灰。

## 已完成改动

### 1. 第一人称 pointer lock 与视角突跳防护

相关文件：

- `apps/web/src/scenes/controls/GuardedPointerLockControls.tsx`
- `apps/web/src/scenes/controls/guardedPointerLock.ts`
- `apps/web/src/scenes/SpaceScene.tsx`
- `apps/web/src/space/requestSpacePointerLock.ts`
- `apps/web/src/space/pointerLockFailure.ts`
- `apps/web/src/pages/SpaceDesktopExperience.tsx`
- `scripts/space-interaction-contract-test.mjs`

处理内容：

- 新增 guarded pointer lock 控制层，替换 raw Drei controls。
- 请求 pointer lock 时尝试 raw movement，并保留 fallback。
- 对异常 `movementX/movementY` spike 做丢弃，避免系统指针真实位置靠近浏览器边缘时视角突然甩飞。
- 保留 dev-only pointer lock sample history：`__SPACE_POINTER_LOCK_DEBUG_SAMPLES__`。
- pointer lock 失败被拆分为 permanent / retryable，retryable 失败不会永久禁用第一人称。
- 修复退出第一人称后 `Alt` / `Esc` 导致键盘和左键无法恢复的问题：键盘 blur 会清状态，retryable pointer lock failure 不再直接关死控制。

判断结论：

- 用户描述的“系统指针真实位置接近窗口边缘后鼠标速度暴增”更像浏览器/系统 pointer lock raw movement 或边缘加速/合成 delta 异常，而不是写死分辨率。代码中没有找到用 MacBook 固定分辨率控制指针区域的逻辑。
- Web 端第一人称 controller 通常规避方式是使用 `Pointer Lock API` 的 `movementX/Y`，可选 raw movement，并对异常大 delta 做 warmup / spike guard；本分支走的就是这个方向。

### 2. 第一人称 movement debug 增强

相关文件：

- `apps/web/src/scenes/debug/spaceMovementDebug.ts`
- `apps/web/src/scenes/debug/SpaceMovementDebugOverlay.tsx`
- `apps/web/src/scenes/Player/PlayerController.tsx`
- `apps/web/src/scenes/exhibits/ExhibitRaycast.tsx`
- `apps/web/src/scenes/collision/colColliders.tsx`
- `apps/web/src/scenes/gallery/GalleryFloorCollider.tsx`
- `apps/web/src/scenes/gallery/SafetyGround.tsx`
- `scripts/space-interaction-contract-test.mjs`

处理内容：

- debug overlay dev-only，挂在 SPACE 左上。
- 移动 debug sample 记录 tick-frequency history：`__SPACE_MOVEMENT_DEBUG_SAMPLES__`。
- 显示当前 raycast mesh，并忽略 `COL_*` debug raycast object。
- collider handle 到 `COL_*` 名称可反查，debug contact 能显示实际接触的碰撞体。
- 每 tick 显示当前位置、实际/期望速度、ratio、target speed、grounded、collision count、vertical velocity。
- 增加 look rotation debug：当前 yaw/pitch、每 tick yaw/pitch/total delta。
- 最新补充实时帧率：`frameRate.fps` 和 `frameRate.frameMs`，由 `useFrame` render delta 平滑计算后随 movement sample 发布。

最新 FPS 相关实现：

- `buildSpaceFrameRateDebugSample({ deltaSec, previous })`
- `SpaceMovementDebugSample.frameRate`
- `PlayerController` 中 `frameRateDebugRef`
- debug overlay 新增 `<dt>fps</dt>` 行

### 3. 0.25m 台阶与胶囊体判断

当前参数位置：

- `apps/web/src/scenes/gallery/resolveGallerySpawn.ts`
- `apps/web/src/scenes/Player/PlayerController.tsx`

当前参数：

- `PLAYER_CAPSULE_RADIUS = 0.25`
- `PLAYER_CAPSULE_HALF_HEIGHT = 0.65`
- `PLAYER_FOOT_OFFSET = 0.9`
- `controller.enableSnapToGround(0.35)`
- `controller.enableAutostep(0.35, 0.15, true)`

判断：

- 0.25m 台阶已经在当前 autostep 的 `0.35` 最大高度范围内，所以单纯改胶囊体不是第一优先。
- 改小胶囊半径可能让台阶边缘更容易“蹭上去”，但会让贴墙、窄缝、碰撞边界都变松。
- 改大胶囊半径可能更容易卡台阶前缘。
- 改半高会影响视角高度、头顶碰撞和 spawn 高度，不适合作为台阶手感的第一刀。

下一步更建议：

- 优先观察 debug overlay 的 `contact` 和 `vertical`，确认卡顿时接触的是 `COL_STAIR_*`、floor split，还是其它 collider。
- 如果确实是台阶边缘卡顿，优先检查 Blender 中 `COL_STAIR_*` 碰撞是否过碎、台阶前缘是否太尖、是否和 floor/platform 重叠。
- 其次再小范围调 `enableAutostep(maxHeight, minWidth, includeDynamicBodies)` 的 `minWidth` 或 snap-to-ground，而不是先动 capsule。

### 4. Focus 展品图片交互

相关文件：

- `apps/web/src/exhibits/FocusOverlay.tsx`
- `apps/web/src/styles/global.css`
- `apps/web/tests/focusOverlayLayout.test.mjs`

处理内容：

- Focus title/subtitle 下移，并与顶部“回到 space”中线对齐。
- 左右文本区域加宽、加高。
- 图片背景阴影去掉，图片圆角矩形。
- 下方分页点上移。
- 图片 hover 浮动改为只有指针确实在图片 frame 上时触发，不在空白附近误触发。
- hover 浮动减少、放慢，不扭曲原图比例/透视。
- 点击图片后进入放大态：
  - 背景半透明变暗并模糊。
  - 左右切换和分页点隐藏。
  - 图片不再有 hover 浮动。
  - 单击画面任意处退出。
  - 非线性放大动画。
- 最新改动把放大态改为 fixed 视口层：
  - 根据当前浏览器窗口面积计算，约占 60% viewport area。
  - 保持图片原始宽高比。
  - `object-fit: contain`，避免左右裁切。
- 切换图片不再从上方飞入，改为轻微水平进入。
- 进入某个展品 Focus 后，预加载该展品全部图片：
  - `preloadedFocusImagesRef`
  - `new Image()`
  - `image.loading = "eager"`
  - active image 也使用 `loading="eager"`
  - 退出 Focus overlay 时释放 ref。

### 5. 自定义光标体验

相关文件：

- `apps/web/src/cursor/SpaceCursorOverlay.tsx`
- `apps/web/src/styles/global.css`
- `scripts/space-interaction-contract-test.mjs`

处理内容：

- Focus 界面光标圆点底下增加淡淡光晕。
- 光标 return/sync 仍跟踪系统 pointer position，避免 pointer lock 退出/恢复期间视觉位置断裂。
- 光标 return 默认回到 viewport center。
- 抓取光标从尖锐星形/多边形改为同一圆形家族，尺寸约 14px，减少从 grab 到 dot 时的瞬间跳切和闪烁。
- `clip-path` 保持圆形，缩短 shape transition，避免形态突变。

### 6. Demo 占位物清理

相关文件：

- `apps/web/public/exhibits/manifest.json`
- `apps/web/public/exhibits/demo_box/*`
- `apps/web/public/exhibits/demo_bass/*`
- `apps/web/public/media/demo_box.mp3`
- `apps/web/tests/exhibitSceneAssets.test.mjs`
- `scripts/exhibit-scene-pipeline-contract-test.mjs`

处理内容：

- 删除 demo box、demo bass 的 GLB、content、placeholder `.gitkeep`。
- 删除 demo box 音频。
- 从 manifest / generated placement / tests 中移除占位展品引用。

### 7. Tree Habitat 材质调整

相关文件：

- `apps/web/public/exhibits/arch_treehabitat/arch_treehabitat.lod0.glb`
- `apps/web/public/exhibits/arch_treehabitat/arch_treehabitat.lod1.glb`
- `apps/web/public/exhibits/arch_treehabitat/arch_treehabitat.lod2.glb`
- `apps/web/public/exhibits/arch_treehabitat/focus_arch_treehabitat.glb`
- `scripts/apply-space-main-materials.py`

处理内容：

- `model white` 更白。
- `model glass` 更灰。
- 已应用到 Tree Habitat 的 focus / LOD GLB。

## 当前验证记录

最近一次已执行并通过：

```text
node --test apps/web/tests/playerMotionAudio.test.mjs
node scripts/space-interaction-contract-test.mjs
npm exec -w apps/web tsc -- --noEmit -p tsconfig.app.json
npm run lint
npm run test:node
npm run build
Invoke-WebRequest -UseBasicParsing -Uri http://127.0.0.1:5174/
```

结果：

- `playerMotionAudio.test.mjs`：16 passed。
- `space-interaction-contract-test.mjs`：passed。
- `tsc --noEmit`：exit 0。
- `eslint`：exit 0。
- `test:node`：44 passed，pipeline contract passed。
- `vite build`：success。
- Vite local server：`200 OK`。

未完成的验证：

- in-app Browser 自动化仍因为当前 Codex 环境缺少 `sandboxPolicy` 元数据而无法连接。
- 因此截图级/真实 pointer lock 交互验证主要依赖用户在真实浏览器手测。

## 工作区注意事项

当前 `git status` 很长，包含本 thread 多轮改动和至少一个既有工作区改动。接手时注意：

- 不要随手 `git reset --hard` 或 checkout 覆盖工作区。
- `BlenderFile/space_main.blend1` 当前是 modified，但不是本次最新 FPS 改动的核心，不要无确认回滚。
- 新增未跟踪文件：
  - `apps/web/src/scenes/controls/GuardedPointerLockControls.tsx`
  - `apps/web/src/scenes/controls/guardedPointerLock.ts`
  - `apps/web/src/space/pointerLockFailure.ts`
- 本交接文件自身是新增文档。

## 建议下一步

1. 在真实 Chrome / Edge 里用 `http://127.0.0.1:5174/` 复测第一人称边缘甩视角问题。
2. 复测退出 first person 后 `Esc` / `Alt` / 左键重进 / WASD 是否稳定。
3. 在楼梯和 0.25m 台阶附近打开 debug overlay，记录卡顿瞬间的：
   - `contact`
   - `vertical`
   - `grounded`
   - `fps`
   - `ratio`
4. 如果台阶仍不顺，优先处理 `COL_STAIR_*` 碰撞形状和 `autostep` 参数，不建议先改 capsule。
5. 等 pointer lock 和 Focus 交互都经真实浏览器确认后，再考虑把 dev debug overlay 改成隐藏开关，或保留为 dev-only 工具。

