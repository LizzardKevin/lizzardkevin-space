# DevLog_3（展品 Focus · 入口 Splash · 输入与后期）

时间：2026-06-02 ~ 2026-06-03（多轮会话）

## 本次目标

- 实现「准星瞄准展品 → 左键进入 Focus 特写」：背后展厅虚化，前景仅展品，鼠标释放后用 Orbit 旋转查看。
- 统一输入规则：**仅在高亮提示出现时**左键进入 Focus；否则左键只做准星脉冲反馈（移除 E 键入口）。
- 重做进入 SPACE 的纯白屏 + 浮动按钮入口，白屏 **2s 线性**淡出并过渡到第一人称 + pointer lock。
- Focus 进入/退出分阶段动画：**界面 300ms**（blur + 加深）→ **内容 150ms**（标题 / 关闭 / Canvas）。
- 渲染：WebGPU + Toon + Fog + Bloom + Vignette；**不使用 AO**；Neutral tone mapping，exposure ≈ 1.15。
- Blender 展品可用 **pivot** 作为旋转中心；代码优先 pivot，仅自动缩放，不再强制 bbox 居中覆盖 pivot。
- Focus 内按钮 hover + billboard 曾完整实现，后按需求 **整段回退**，等待新交互方案。

## 已完成产出

### 1) 展品瞄准与左键 Focus

- `apps/web/src/scenes/exhibits/ExhibitRaycast.tsx`
  - 每帧中心射线检测，向父级冒泡查找 `userData.exhibitId`（子 mesh 常无 id）。
  - 距离门限：`EXHIBIT_TARGET.maxDistance`（5 m）。
  - 输入改为 **`mousedown`**（pointer lock 下 `click` 不稳定）。
  - `suppressNextClick`：退出 Focus 后吞掉第一次左键，避免立刻再次进入。
- `apps/web/src/pages/SpacePage.tsx`
  - `controlsEnabled = entered && !overlay && !focused`。
  - Focus 时主 Canvas 外包 `space-canvasWrap--disabled`（`pointer-events: none`），底层不接事件。
  - 进入 Focus 前 `exitPointerLock`；关闭后 `requestSpacePointerLock`。
- `apps/web/src/scenes/SpaceScene.tsx`
  - `PointerLockControls` 仅在 `controlsEnabled` 时挂载。

### 2) Focus 叠层与模型归一化

- `apps/web/src/exhibits/FocusOverlay.tsx`
  - 独立透明 WebGPU Canvas + `OrbitControls`（`enablePan: false`）。
  - 进入：RAF 开启 blur/dim → **300ms** 后 `contentVisible`；退出：先藏内容 **150ms** → 解除 blur/dim → **450ms** 后 `onClose`。
  - `FocusModel`：`useGLTF` 结果 **clone**，避免重复进入时 scale/position 累积；按最大边缩放到 ~1.8 m；**pivot 节点优先**对齐原点（`pivot` / `*_pivot` / `pivot_*` 等命名）。
  - 按钮 mesh：`userData.focusButtonAction` + `onPointerDown` 冒泡；仅点到按钮时 `stopPropagation`，不挡 Orbit 拖拽。
  - ESC / 右上角关闭。
- 曾实现：按钮 hover emissive + Html billboard（play/pause/end）→ **已按需求回退**。

### 3) 入口 Splash（纯白屏）

- `SpacePage.tsx`：`space-splash` 全屏白底 + `space-enterButton` 浮动文案按钮。
- 点击流程：`audio.unlock` → 按钮淡出（~650ms）→ `entryIsFading` → splash **opacity 2s linear** → `transitionend` 后 `entered` + pointer lock。
- `apps/web/src/styles/global.css`
  - `.space-canvasWrap--entry` / `--entryFading`：背景 Canvas `filter` 过渡（blur + brightness），与 splash 同步 **2s linear**。
  - 按钮浮动 keyframes、hover、淡出 class。

### 4) 准星与空点击反馈

- `apps/web/src/components/Crosshair.tsx` + `global.css`
  - 悬停展品：`crosshair--active`。
  - 无目标左键：`crosshair--pulse`（由 `crosshairPulseNonce` 触发）。
  - 修复：去掉基础 idle 动画，避免与 pulse 叠加 **连闪两次**。

### 5) 渲染与展厅视觉

- `apps/web/src/rendering/createWebGPURenderer.ts`
  - `alpha` 支持（Focus 叠层透明底）。
  - `NeutralToneMapping`，`toneMappingExposure: 1.15`。
- `apps/web/src/rendering/GalleryRenderPipeline.tsx`
  - TSL **Bloom** + **Vignette**；**无 GTAO / N8AO**。
- `apps/web/src/scenes/gallery/galleryConfig.ts`
  - `fillLight.intensity: 0.5`，`hemisphere.intensity: 0.5`。
  - `GALLERY_BLOOM.strength: 0.4`，`threshold: 0.78`。
  - 指数雾 `fogDensity: 0.028`，`fogNear/Far: 10/32`。
- `apps/web/src/scenes/gallery/prepareGalleryScene.ts`
  - 展厅 mesh Toon 材质；曾加重叠 mesh 隐藏兜底 z-fighting（若仍闪，优先查 GLB 重复面）。

### 6) 其它手感

- `apps/web/src/scenes/Player/PlayerController.tsx`：站立 idle 轻微上下漂浮（~0.007 m）。
- `GallerySpawnContext`：`setSafetyCenter` 改为 `useCallback`，修复 **Maximum update depth exceeded**。

## 遇到的问题与处理

| 问题 | 处理 |
|------|------|
| 左键点展品无反应 | `click` → `mousedown`；射线向父级找 `exhibitId`；`controlsEnabled` 含 `!focused` |
| Focus 内无法拖转 / 只能拖一次 | 曾顶层 `capture`+`stopPropagation` → 连一次都拖不动 → **回退**；改主 Canvas `pointer-events: none` + Focus 独立 Canvas |
| 退出 Focus 立刻再进 | `suppressNextExhibitClick` 吞第一次左键 |
| 准星脉冲闪两下 | 移除 `.crosshair` 常驻 idle，仅 pulse keyframes |
| WebGPU `RGBFormat` 报错 | toon `gradientMap` 改 `RGBAFormat` + `NoColorSpace`、无 mipmaps |
| 白屏淡出“不均匀” | splash / canvas filter 统一 **2000ms linear** |
| `Object3D.material` TS 报错 | 在 `isMesh` 分支内 cast `THREE.Mesh` |
| `demo.mp3` 无声音 | manifest 有路径，需补 `public/media/demo.mp3` |

## 当前运行时开关（摘要）

```text
ENABLE_GALLERY_TOON = true
ENABLE_GALLERY_AMBIENT_OCCLUSION = false（无实时 AO）
ENABLE_GALLERY_BLOOM = true（strength 0.4）
ENABLE_GALLERY_VIGNETTE = true
ENABLE_GALLERY_RUNTIME_SHADOWS = false
WebGPURenderer: NeutralToneMapping, exposure 1.15
```

## 下一步计划

1. **Focus 三按钮交互**：在新方案下重做 hover / 状态 / billboard（当前已回退）。
2. **补媒体资源**：`public/media/demo.mp3`；focus GLB 缓存版本（`?v=` 或 revision bump）。
3. **展厅材质**：若仍随视角明暗跳变，在 Blender 去重面或保留烘焙 AO，而非再叠加强制纯色 Toon。
4. **部署验证**：`npm run build` 后完整上传 `dist/`（含 `assets/`）。
5. **DevStories**：开发日志列表页对接 `docs/devlog/` 本地 Markdown。

## 相关文件索引

- 输入/瞄准：`ExhibitRaycast.tsx`，`exhibitTarget.ts`，`Crosshair.tsx`
- Focus：`FocusOverlay.tsx`，`runExhibitButtonAction.ts`，`manifest.ts`
- 页面：`SpacePage.tsx`，`SpaceScene.tsx`，`global.css`
- 渲染：`createWebGPURenderer.ts`，`GalleryRenderPipeline.tsx`，`galleryConfig.ts`，`prepareGalleryScene.ts`
- 玩家：`PlayerController.tsx`
