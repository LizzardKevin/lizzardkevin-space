# DevLog_2（WebGPU 迁移 · 物理 · 视觉 · 性能）

时间：2026-05-29 ~ 2026-06-01（多轮会话，今日收工）

## 本次目标

- 完成 `gallery_main.glb` 主场景在 **WebGPU** 下的渲染迁移（替换 WebGL + N8AO/EffectComposer）。
- 修复平台台阶、外墙等 **碰撞** 与 **移动手感**。
- 在不用 GTAO 的前提下，逼近 **Firewatch 式** 平面 Toon 着色 + 雾 + 轻量 Bloom。
- 排查卡顿与白屏，并启动 **Blender 烘焙 AO** 流程（进行中）。

## 已完成产出

### 1) WebGPU 渲染栈（Phase 0–4）

- 新增 WebGPU 基础设施：
  - `apps/web/src/rendering/webgpuSupport.ts` — 能力检测、超时、错误文案
  - `apps/web/src/rendering/createWebGPURenderer.ts` — `WebGPURenderer` + `init()`
  - `apps/web/src/rendering/WebGPUUnavailable.tsx` — 不支持 WebGPU 时的提示页
  - `apps/web/src/rendering/WebGPUErrorBoundary.tsx` — Canvas 初始化失败兜底
- `SpacePage` / `FocusOverlay` 均改用 WebGPURenderer；移除 WebGL `shadowMap` 专有配置。
- `GalleryRenderPipeline.tsx` — TSL **GTAO** + **Bloom**（`RenderPipeline` + `useFrame` priority 1）。
- 移除 `@react-three/postprocessing`、`postprocessing`（N8AO 依赖树）。
- 默认阴影关闭：`ENABLE_GALLERY_RUNTIME_SHADOWS = false`（Blender 删阳光后避免运行时 shadow map 假影）。

### 2) 物理与碰撞

- **Trimesh 烘焙**：`trimeshColliderUtils.ts` — root 空间烘焙 + **双面三角**（解决平台/外墙 trimesh 失效）。
- `COL_outer_*` / `COL_platform_*` 走 TrimeshCollider；`COL_inner_*` 仍 cuboid。
- `GalleryFloorCollider` — 在 `COL_platform_*` XZ 区域对地面薄板 **开孔**，避免与台阶 trimesh 打架。
- **PlayerController**：
  - 胶囊：直径 0.5 m，总高 1.8 m，眼高 offset +0.7 m
  - `enableAutostep(0.35, 0.15)` — 上台阶
  - 速度：WALK 2.45 / SPRINT 3.85 m/s
  - **smoothstep + lerp** 加减速；`MOVE_ACCEL 11` / `MOVE_DECEL 15`（约为初版 2 倍，响应更干脆）

### 3) 视觉管线迭代（GTAO ↔ Toon）

| 阶段 | 做法 | 结果 |
|------|------|------|
| WebGL 后处理 | N8AO + Bloom | 已移除 |
| WebGPU GTAO | RenderPipeline + GTAONode | 有墙根 AO，但 **偏卡**；与 Toon 叠加强时易过暗 |
| MeshBasicMaterial | 无光照纯色 | 稳定灰，但 **结构看不清** |
| **当前方案** | **MeshToonMaterial + gradientMap + Fog + 调光** | Firewatch 向色阶；GTAO **关** |
| Bloom | 轻量开启 | `strength 0.28`，`threshold 0.82` |

- 新增：
  - `galleryToonMaterial.ts` — 四档灰度 `gradientMap` + `MeshToonMaterial`
  - `GalleryAtmosphere.tsx` — `THREE.Fog`（`fogNear 16` / `fogFar 52`）
  - `galleryConfig.ts` — `GALLERY_TOON` 灯光/雾/色带参数；`ENABLE_GALLERY_TOON = true`
- TopBar：去掉底色条，文字加 **浅阴影** 以在浅灰背景上可读。

### 4) 性能与资产审计

- `gallery_main.glb` 可见三角面 **~17,708**（运行时隐藏 `COL_*`）。
  - 建筑 `struct_*` 仅 **~5,406** 面 — 合理。
  - **`exhibit_demo_box` 单物体 ~12,278 面** — 占可见面数约 69%，优先减面候选。
- 物理碰撞 trimesh（双面）约 **~10,372** 面 — CPU 侧亦有成本。
- 有 GTAO 时建议整场景可见面 **≤ 3 万**；当前 Toon + 轻 Bloom 路径对几何压力较小，卡顿主要来自后处理与 JS 包体（~4.2 MB）。

### 5) 部署与白屏排查

- 仓库 **无 git remote / 无 CI 自动部署**；`npm run build` 产物在 `apps/web/dist/`，需 **手动上传** COS / Cloudflare Pages（见 `docs/tencent-cloud-deploy.md`）。
- 本地 `npm run preview` 正常；线上白屏常见原因：只上传 `index.html` 未传 `assets/`、或 JS 404。
- 补充：`index.html` Loading 占位、`AppErrorBoundary`、WebGPU 检测 loading 文案；进入前背景改深色避免「假白屏」。

### 6) 文档与规范

- `docs/assets/exhibit-asset-tracker-gallery_nodes.csv` — 更新为 WebGPU GTAO/Bloom 描述（后续可改回 Toon + 烘焙 AO）。
- `docs/gallery-mesh-naming.md` — 已有 `struct_` / `COL_` / `bulb_` 约定；GLB 内 **尚无 `bulb_` mesh**（点光源列表为空）。

### 7) Blender 烘焙 AO（进行中，未完工）

- 目标：用 **烘焙 AO** 替代实时 GTAO，贴近 Firewatch（结构在资产里，不在后处理里）。
- 已梳理 Cycles **Ambient Occlusion Bake** 流程；用户卡在 **「no active and selected image texture node」**。
- 正确做法：Shader Editor 里 **左键点选** `ao_*` Image Texture 节点（橙框）→ 再点 Bake；节点 **无需** 连到 Principled。
- 今日收工点：节点结构已对，待掌握「选中 active 节点」后完成首次烘焙。

## 遇到的问题与处理

| 问题 | 处理 |
|------|------|
| WebGPU 迁移后材质全黑 | GTAO 乘法 + RenderPipeline 与 Toon/Basic 组合不稳定；改为 Toon + 关 GTAO |
| 关 GTAO 后太白、结构不清 | 上 Toon gradientMap + Fog + 主/补光分层 |
| GTAO 开启后卡顿 | 三角面不是主因；GTAO 16 samples + 半分辨率仍重；Toon 路径关 GTAO |
| 平台台阶穿模 / trimesh 无效 | 双面烘焙 + 地面开孔 + autostep |
| 线上白屏 | 非自动部署；加强 loading/error UI；需确认 `dist/assets` 完整上传 |
| Blender Bake 报错 | 需在 Shader Editor **选中** Image Texture 节点（active） |

## 当前运行时开关（摘要）

```text
ENABLE_GALLERY_TOON = true
ENABLE_GALLERY_AMBIENT_OCCLUSION = false
ENABLE_GALLERY_BLOOM = true（轻量）
ENABLE_GALLERY_RUNTIME_SHADOWS = false
```

## 下一步计划

1. **Blender AO 烘焙**：完成 `struct_*` atlas 烘焙 → 导出 glb → 改 `prepareGalleryScene` **保留** `aoMap`/albedo（不再整表覆盖为纯色 Toon）。
2. **减面**：`exhibit_demo_box` 降至 2k–4k 三角面；外墙可选 LOD。
3. **部署**：构建并上传完整 `apps/web/dist/`；确认 CDN 对 `index.html` 短缓存、`assets/*` 长缓存。
4. **FocusOverlay**：同步 Toon/雾/Bloom 策略；`useMemo` 副作用已改 `useEffect`。
5. **音频 zone**：按空间位置切换 BGM（当前仍 hardcode `"architecture"`）。
6. **DevStories 内容**：对接 `docs/devlog/` 本地 Markdown。

## 相关文件索引

- 渲染：`apps/web/src/rendering/*`，`apps/web/src/scenes/gallery/galleryConfig.ts`
- Toon：`galleryToonMaterial.ts`，`GalleryAtmosphere.tsx`，`prepareGalleryScene.ts`
- 物理：`PlayerController.tsx`，`trimeshColliderUtils.ts`，`colColliders.tsx`，`GalleryFloorCollider.tsx`
- 页面：`SpacePage.tsx`，`TopBar.tsx`
