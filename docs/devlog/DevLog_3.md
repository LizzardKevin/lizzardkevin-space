# DevLog_3（展品 Focus · 入口 Splash · 输入与后期）

时间：2026-06-02 ~ 2026-06-03（多轮会话）

## 这次想做成什么

- 准星瞄到展品，左键进 Focus：背后展厅虚化，前面只留展品，松开鼠标后用 Orbit 转着看。
- 输入规则：只有高亮提示出现时，左键才进 Focus；否则左键只做准星脉冲。E 键入口拿掉。
- 重做进 SPACE 的纯白屏 + 浮动按钮：白屏 2s 线性淡出，再进第一人称和 pointer lock。
- Focus 进出分两段：界面 300ms（blur + 加深），内容 150ms（标题 / 关闭 / Canvas）。
- 渲染：WebGPU + Toon + Fog + Bloom + Vignette，不开 AO；Neutral tone mapping，exposure ≈ 1.15。
- Blender 展品可用 pivot 当旋转中心；代码优先 pivot，只做自动缩放，不再用 bbox 强制盖掉 pivot。
- Focus 内按钮 hover + billboard 做过完整版，后来按需求整段回退，等新交互方案。

## 做完了什么

### 1) 展品瞄准和左键 Focus

`ExhibitRaycast.tsx`：每帧中心射线，向父级冒泡找 `userData.exhibitId`（子 mesh 常常没有 id）。距离门限 `EXHIBIT_TARGET.maxDistance`（5 m）。输入改成 `mousedown`，pointer lock 下 `click` 不稳。退出 Focus 后用 `suppressNextClick` 吞掉第一次左键，避免立刻再进。

`SpacePage.tsx`：`controlsEnabled = entered && !overlay && !focused`。Focus 时主 Canvas 加 `space-canvasWrap--disabled`（`pointer-events: none`）。进 Focus 前 `exitPointerLock`，关闭后再 `requestSpacePointerLock`。`SpaceScene.tsx` 里 `PointerLockControls` 只在 `controlsEnabled` 时挂载。

### 2) Focus 叠层和模型归一化

`FocusOverlay.tsx`：独立透明 WebGPU Canvas + OrbitControls（`enablePan: false`）。进入时 RAF 开 blur / dim，300ms 后 `contentVisible`；退出先藏内容 150ms，再解除 blur / dim，450ms 后 `onClose`。

`FocusModel` 会 clone `useGLTF` 结果，避免重复进入时 `scale` / `position` 叠上去。按最大边缩到约 1.8 m；对齐原点优先找 `pivot` / `*_pivot` / `pivot_*`。按钮 mesh 用 `userData.focusButtonAction` + `onPointerDown` 冒泡；只有点到按钮才 `stopPropagation`，免得挡 Orbit。ESC 和右上角都能关。

按钮 hover emissive + Html billboard（play / pause / end）做过，已按需求回退。

### 3) 入口 Splash

`SpacePage.tsx`：`space-splash` 全屏白底 + `space-enterButton`。点击后：`audio.unlock` → 按钮淡出约 650ms → `entryIsFading` → splash opacity 2s linear → `transitionend` 后 `entered` + pointer lock。`global.css` 里 `.space-canvasWrap--entry` / `--entryFading` 用 `filter`（blur + brightness）跟 splash 同步 2s linear。

### 4) 准星和空点击

`Crosshair.tsx`：悬停展品用 `crosshair--active`；无目标左键用 `crosshair--pulse`（`crosshairPulseNonce` 触发）。`.crosshair` 的基础 idle 动画拿掉了，不然会跟 pulse 叠成连闪两次。

### 5) 渲染

`createWebGPURenderer.ts`：支持 `alpha`（Focus 透明底）；`NeutralToneMapping`，`toneMappingExposure: 1.15`。`GalleryRenderPipeline.tsx`：TSL Bloom + Vignette，没有 GTAO / N8AO。`galleryConfig.ts`：`fillLight.intensity: 0.5`、`hemisphere.intensity: 0.5`；`GALLERY_BLOOM.strength: 0.4`、`threshold: 0.78`；指数雾 `fogDensity: 0.028`，`fogNear/Far: 10/32`。`prepareGalleryScene.ts` 给展厅 mesh 上 Toon；重叠 mesh 隐藏兜底试过，若还闪优先查 GLB 重复面。

### 6) 其它手感

`PlayerController`：站立 idle 轻微上下漂（约 0.007 m）。`GallerySpawnContext` 的 `setSafetyCenter` 改 `useCallback`，修掉 Maximum update depth exceeded。

## 问题和处理

| 问题 | 处理 |
|------|------|
| 左键点展品没反应 | `click` → `mousedown`；向父级找 `exhibitId`；`controlsEnabled` 含 `!focused` |
| Focus 里拖不动 / 只能拖一次 | 顶层 `capture` + `stopPropagation` 试过，反而拖不动；改主 Canvas `pointer-events: none` + Focus 独立 Canvas |
| 退出立刻再进 | `suppressNextExhibitClick` |
| 准星闪两下 | 去掉常驻 idle，只留 pulse |
| WebGPU `RGBFormat` 报错 | toon `gradientMap` 改 `RGBAFormat` + `NoColorSpace`、关 mipmaps |
| 白屏淡出不均匀 | splash / canvas filter 统一 2000ms linear |
| `Object3D.material` TS | `isMesh` 分支里 cast `THREE.Mesh` |
| `demo.mp3` 没声音 | manifest 有路径，还缺 `public/media/demo.mp3` |

## 当前开关

```text
ENABLE_GALLERY_TOON = true
ENABLE_GALLERY_AMBIENT_OCCLUSION = false
ENABLE_GALLERY_BLOOM = true（strength 0.4）
ENABLE_GALLERY_VIGNETTE = true
ENABLE_GALLERY_RUNTIME_SHADOWS = false
WebGPURenderer: NeutralToneMapping, exposure 1.15
```

## 下一步

1. Focus 三按钮：在新方案下重做 hover / 状态 / billboard。
2. 补 `public/media/demo.mp3`；focus GLB 缓存版本（`?v=` 或 revision bump）。
3. 展厅材质若还随视角跳明暗，优先 Blender 去重面或保留烘焙 AO。
4. `npm run build` 后完整上传 `dist/`（含 `assets/`）。
5. DevStories 对接 `docs/devlog/`。

## 相关文件

输入 / 瞄准：`apps/web/src/scenes/exhibits/ExhibitRaycast.tsx`，`apps/web/src/exhibits/exhibitTarget.ts`，`apps/web/src/components/Crosshair.tsx`
Focus：`apps/web/src/exhibits/FocusOverlay.tsx`，`apps/web/src/exhibits/runExhibitButtonAction.ts`，`apps/web/src/exhibits/manifest.ts`
页面：`apps/web/src/pages/SpacePage.tsx`，`apps/web/src/scenes/SpaceScene.tsx`，`apps/web/src/styles/global.css`
渲染：`apps/web/src/rendering/createWebGPURenderer.ts`，`apps/web/src/rendering/GalleryRenderPipeline.tsx`，`apps/web/src/scenes/gallery/galleryConfig.ts`，`apps/web/src/scenes/gallery/prepareGalleryScene.ts`
玩家：`apps/web/src/scenes/Player/PlayerController.tsx`
