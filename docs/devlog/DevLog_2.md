# DevLog_2（WebGPU 迁移 · 物理 · 视觉 · 性能）

时间：2026-05-29 ~ 2026-06-01（多轮会话，今日收工）

## 这次想做成什么

- 把 `gallery_main.glb` 主场景迁到 WebGPU，换掉 WebGL + N8AO / EffectComposer。
- 修平台台阶、外墙的碰撞和移动手感。
- 不用 GTAO 的前提下，尽量靠近 Firewatch 那种平面 Toon + 雾 + 轻 Bloom。
- 查卡顿和白屏；Blender 烘焙 AO 开了头，还没做完。

## 做完了什么

### 1) WebGPU 渲染栈（Phase 0-4）

新增：

- `apps/web/src/rendering/webgpuSupport.ts`：能力检测、超时、错误文案
- `apps/web/src/rendering/createWebGPURenderer.ts`：`WebGPURenderer` + `init()`
- `apps/web/src/rendering/WebGPUUnavailable.tsx`：不支持时的提示页
- `apps/web/src/rendering/WebGPUErrorBoundary.tsx`：Canvas 初始化失败兜底

`SpacePage` / `FocusOverlay` 都改用 WebGPURenderer，去掉 WebGL `shadowMap` 专有配置。`apps/web/src/rendering/GalleryRenderPipeline.tsx` 接过 TSL GTAO + Bloom（`RenderPipeline` + `useFrame` priority 1）。`@react-three/postprocessing` 和 `postprocessing`（N8AO 那棵树）已移除。默认关阴影：`ENABLE_GALLERY_RUNTIME_SHADOWS = false`（Blender 删了阳光之后，运行时 shadow map 容易出假影）。

### 2) 物理和碰撞

- `trimeshColliderUtils.ts`：在 root 空间烘焙，双面三角，不然平台 / 外墙 trimesh 经常失效。
- `COL_outer_*` / `COL_platform_*` 走 TrimeshCollider；`COL_inner_*` 仍用 cuboid。
- `GalleryFloorCollider`：在 `COL_platform_*` 的 XZ 区域给地面薄板开孔，避免和台阶 trimesh 打架。
- `PlayerController`：
  - 胶囊直径 0.5 m，总高 1.8 m，眼高 offset +0.7 m
  - `enableAutostep(0.35, 0.15)`
  - WALK 2.45 / SPRINT 3.85 m/s
  - smoothstep + lerp 加减速；`MOVE_ACCEL 11` / `MOVE_DECEL 15`（大约是初版两倍，手感更干脆）

### 3) 视觉：GTAO 试过，最后回到 Toon

| 阶段 | 做法 | 结果 |
|------|------|------|
| WebGL 后处理 | N8AO + Bloom | 已移除 |
| WebGPU GTAO | RenderPipeline + GTAONode | 墙根有 AO，但偏卡；和 Toon 叠重了容易过暗 |
| MeshBasicMaterial | 无光照纯色 | 稳定，但结构看不清 |
| 当前 | `MeshToonMaterial` + `gradientMap` + Fog + 调光 | Firewatch 向色阶；GTAO 关 |
| Bloom | 轻量开 | `strength 0.28`，`threshold 0.82` |

新增 `galleryToonMaterial.ts`（四档灰度 `gradientMap`）、`GalleryAtmosphere.tsx`（`THREE.Fog`，`fogNear 16` / `fogFar 52`）、`apps/web/src/scenes/gallery/galleryConfig.ts` 里的 `GALLERY_TOON` 参数，并设定 `ENABLE_GALLERY_TOON = true`。TopBar 去掉底色条，文字加浅阴影，浅灰背景上才读得清。

### 4) 性能和资产

`gallery_main.glb` 可见三角面约 17,708（运行时隐藏 `COL_*`）。建筑 `struct_*` 大约 5,406 面，还算合理；`exhibit_demo_box` 一个物体就约 12,278 面，占可见面大概 69%，减面优先做它。物理双面 trimesh 约 10,372 面，CPU 也有成本。有 GTAO 时整场景最好压到 3 万面以下；现在走 Toon + 轻 Bloom，几何压力小一些，卡顿更多来自后处理和 JS 包体（约 4.2 MB）。

### 5) 部署和白屏

仓库当时还没有 git remote / CI。`npm run build` 产物在 `apps/web/dist/`，得手动上传 COS 或 Cloudflare Pages（见 `docs/tencent-cloud-deploy.md`）。本地 `npm run preview` 正常；线上白屏常见原因是只传了 `index.html`，没把 `assets/` 带上，或者 JS 404。补了 Loading 占位、`AppErrorBoundary`、WebGPU 检测文案；进页前背景改深色，少一点「假白屏」。

### 6) 文档

`docs/assets/exhibit-asset-tracker-gallery_nodes.csv` 更新过 WebGPU GTAO / Bloom 描述（后面可以改回 Toon + 烘焙 AO）。`docs/gallery-mesh-naming.md` 里已有 `struct_` / `COL_` / `bulb_` 约定；GLB 里暂时还没有 `bulb_` mesh，点光源列表是空的。

### 7) Blender 烘焙 AO（未完工）

想用烘焙 AO 替代实时 GTAO，把结构感放进资产。Cycles Ambient Occlusion Bake 流程已经理过一遍；用户卡在 “no active and selected image texture node”。正确做法是：Shader Editor 里左键点中 `ao_*` Image Texture 节点（出现橙框），再点 Bake；节点不必接到 Principled。今天收工时节点结构已经对了，下次把「选中 active」做熟就能出第一次烘焙。

## 问题和处理

| 问题 | 处理 |
|------|------|
| WebGPU 后材质全黑 | GTAO 乘法和 RenderPipeline 跟 Toon / Basic 叠不稳；改 Toon，关 GTAO |
| 关 GTAO 后太白、结构不清 | Toon gradientMap + Fog + 主补光分层 |
| 开 GTAO 卡顿 | 主因不是三角面；16 samples + 半分辨率仍然重；Toon 路径关 GTAO |
| 台阶穿模 / trimesh 无效 | 双面烘焙 + 地面开孔 + autostep |
| 线上白屏 | 非自动部署；加强 loading / error；确认 `dist/assets` 完整上传 |
| Blender Bake 报错 | Shader Editor 里选中 Image Texture 节点 |

## 当前开关

```text
ENABLE_GALLERY_TOON = true
ENABLE_GALLERY_AMBIENT_OCCLUSION = false
ENABLE_GALLERY_BLOOM = true（轻量）
ENABLE_GALLERY_RUNTIME_SHADOWS = false
```

## 下一步

1. 做完 `struct_*` atlas 烘焙，导出 glb，让 `prepareGalleryScene` 保留 `aoMap` / albedo，别再整表盖成纯色 Toon。
2. `exhibit_demo_box` 减到 2k-4k 三角面；外墙可考虑 LOD。
3. 构建并上传完整 `apps/web/dist/`；CDN 对 `index.html` 短缓存、`assets/*` 长缓存。
4. FocusOverlay 对齐 Toon / 雾 / Bloom；副作用从 `useMemo` 改到 `useEffect`（已改）。
5. 音频 zone：按位置切 BGM（现在还 hardcode `"architecture"`）。
6. DevStories 对接 `docs/devlog/`。

## 相关文件

渲染：`apps/web/src/rendering/*`，`apps/web/src/scenes/gallery/galleryConfig.ts`
Toon：`apps/web/src/scenes/gallery/galleryToonMaterial.ts`，`apps/web/src/scenes/gallery/GalleryAtmosphere.tsx`，`apps/web/src/scenes/gallery/prepareGalleryScene.ts`
物理：`apps/web/src/scenes/Player/PlayerController.tsx`，`apps/web/src/scenes/collision/trimeshColliderUtils.ts`，`apps/web/src/scenes/collision/colColliders.tsx`，`apps/web/src/scenes/gallery/GalleryFloorCollider.tsx`
页面：`apps/web/src/pages/SpacePage.tsx`，`apps/web/src/components/TopBar.tsx`
