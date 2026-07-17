# Thread Handoff: kimi → codex（SPACE 墨线描边 + 锐利阴影 + AA）

时间：2026-07-17
分支：`kimi/frontend-enhancement`（从 main @ `343d0e8` 重置的干净起点）
本地 Vite：`http://127.0.0.1:5173/`（`npm run dev:local` 或 `npm run dev -w apps/web -- --host 127.0.0.1 --port 5173`）

## 交接摘要

本轮以 `messenger.abeto.co` 为参考，把 SPACE 桌面展厅从"半 toon"（四档平色、无描线、无阴影、无饱和点缀）推到漫画风：**墨线外轮廓（两档都有）+ 完整档锐利阴影 + 抗锯齿 + 克制饱和点缀**，同时把性能压在设计内（稳态零阴影成本、描线合并 draw call、零新运行时依赖）。

前置产物（已提交）：

- 计划书：session plan（用户已批准）
- 设计 spec：`docs/superpowers/specs/2026-07-17-space-ink-outline-shadows-design.md`（commit `469e996`）
- V2 设计契约 V3 附录：`docs/design/space-visual-system-v2.md`（撤回了 Phase 9 的"不得加描线 pass/复制几何"条款，commit `469e996`）

用户确认的三项偏好（设计约束）：① 粗黑漫画外轮廓（非全线稿）② 描线两档都要、阴影只在完整档 ③ 保持 V2 色板、只做饱和点缀。

工作区注意（沿用上份 handoff 的警告）：

- `BlenderFile/space_main.blend1` 与工作区两个未跟踪 GLB（`apps/web/public/models/space_main_from rhino.glb` / `.glbbak`）是 Rhino 重导入流程的既有产物，**不要误删、回滚或提交**。
- 本分支改动全部已提交（两个 commit：feat + docs），无遗留未提交代码。

## 已完成改动

### 1. 墨线描线系统（反向壳，两档通用）

为什么选反向壳而不是屏幕空间边检：用户要的是"外轮廓"而非全棱线；反向壳只画剪影、天然漫画感；不依赖后处理管线，简化档（WebGL2）零额外 pass；后端无关（普通 mesh + 共享材质，WebGPU/WebGL2 通吃）；合并后 draw call 只 +1。

新文件 `apps/web/src/scenes/gallery/galleryInkOutline.ts`：

- `createInkShellGeometry(sources, width)`：每源 mesh 取 position+index → `applyMatrix4(matrixWorld)`（世界空间）→ `BufferGeometryUtils.mergeVertices` 焊接 → `computeVertexNormals` 平滑法线 → 沿法线外扩 → 删除 normal → `mergeGeometries` 合并。硬边分裂导致壳在拐角破洞的经典问题由"焊接+平滑法线"解决。
- `getGalleryInkOutlineMaterial()`：全局共享一个 `MeshBasicMaterial`（`ink` #17282a、`toneMapped:false`、`side:BackSide`、`polygonOffset(1,1)`）。polygonOffset 是第三轮手测加的兜底：壳体轻微穿透齐平相邻面时在深度测试中隐藏。
- `addGalleryInkOutline(root, sources)`：挂/换 `SPACE_INK_OUTLINE` 壳 mesh（幂等），`castShadow/receiveShadow=false`、`raycast` 置空。
- `addExhibitInkOutline(root)` / `disposeExhibitInkOutline(root)`：展品级壳，在展品**本地空间**生成（`root.matrixWorld` 求逆 × 各 mesh 世界矩阵），作为子节点跟随展品变换与 LOD 卸载；`EXHIBIT_INK_OUTLINE_SUFFIX` 标记。
- `GALLERY_INK_OUTLINE_EXCLUDED_PREFIXES`：`STRUCT_FLOOR_/ARCH_FLOOR_/STRUCT_STAIR_/ARCH_STAIR_`（可行走面不描边，第一轮手测决定）。

挂接 `apps/web/src/scenes/gallery/prepareGalleryScene.ts`：

- 遍历中收集 `getGalleryMaterialStyleAction(name) === "stylize"` 的 mesh，追加排除 floor/stair 前缀和 `GALLERY_INK.exemptPatterns`（见 §5 天窗修复）。
- 遍历结束 `addGalleryInkOutline(root, inkSources)`。
- 顺手补齐本文件所有 import 的 `.ts` 扩展名（node --test 直接 import 需要，仓库惯例一致）。

展品壳 `apps/web/src/scenes/exhibits/SceneExhibitPlacement.tsx`：

- `SceneExhibitModel` 的 `useMemo` 里 `object.updateMatrixWorld(true)` 之后调 `addExhibitInkOutline(object)`（受 `ENABLE_GALLERY_INK_OUTLINES` 门控）。
- 卸载 cleanup：**先 `disposeExhibitInkOutline` 再 `disposeSceneExhibitMaterials`**——顺序错了会把全局共享墨线材质 dispose 掉（`scene-pipeline.contract-test.mjs` 的断言已按此更新）。
- mount/unmount 都调 `refreshStaticShadowMap(gl)`（见 §2 静态阴影策略）。

### 2. 锐利阴影（仅完整档 full/WebGPU）

新文件 `apps/web/src/scenes/gallery/galleryShadow.ts`：

- `fitDirectionalShadowCamera(light, bounds, margin)`：**光空间 AABB 紧致拟合**——key 光保持 authored 方向，沿方向推出 `radius*2+margin`，target 钉在包围盒中心；把 8 个包围盒角点投到灯光视图系，逐轴取 min/max 作为正交相机范围 + margin，near/far 贴投影深度。比包围球拟合省一半贴图且深度跨度小（acne 天敌）。
  - 坑：`Matrix4.lookAt` 构造的是**对象矩阵**（local→world），不是视图矩阵；必须先拼 `T·R` 再 `invert()`。
- `refreshStaticShadowMap(renderer)`：`autoUpdate=false` 时才置 `needsUpdate=true`。
- `GALLERY_KEY_LIGHT_NAME = "space_gallery_key_light"`：SpaceSession 给 key 光命名，GalleryModel 按名查找做拟合，避免穿三层 props。

`apps/web/src/space/SpaceSession.tsx`：key 光 `name={GALLERY_KEY_LIGHT_NAME}`、`castShadow={profile.shadows && ENABLE_GALLERY_RUNTIME_SHADOWS}`（双门控：简化档永不挂阴影）、`shadow-mapSize={GALLERY_SHADOW.mapSize}`、`shadow-normalBias`、`shadow-bias`。

`apps/web/src/scenes/gallery/GalleryModel.tsx`：

- `useEffect`：`profile.shadows` 为真时 `scene.getObjectByName(GALLERY_KEY_LIGHT_NAME)` + `Box3.setFromObject(gltf.scene)` 调 `fitDirectionalShadowCamera`。
- 灯泡点光 `castShadow={false}`：从全局开关解耦（8 盏点光 = 48 张 cube 面，太贵；spec 明确不投）。

`apps/web/src/space/SpaceCanvasHost.tsx`：

- `shadows={... ? { type: PCFShadowMap } : false}`：**从 BasicShadowMap 改来**——Basic 的零过滤硬锯齿在第一轮手测被否，PCF 3×3 过滤后边缘又锐又干净。
- `onCreated`：`gl.shadowMap.autoUpdate = false; needsUpdate = true`——**静态更新策略**：首帧渲一次阴影贴图，之后仅在展品 LOD 挂载/卸载时按需重渲（`refreshStaticShadowMap`），稳态每帧阴影成本≈0。

`apps/web/src/scenes/gallery/prepareGalleryScene.ts`：`castShadow` 与 `receiveShadow` 都排除 `GLASS_` 和发光体（`isGalleryLightMesh`）。receive 也排除是第四轮手测修的：透明玻璃表面被印上影子，看起来像影子飘在玻璃前面。

### 3. 抗锯齿

- `apps/web/src/rendering/createWebGPURenderer.ts`：`antialias` 从硬编码 `false` 改为读 `ENABLE_GALLERY_RENDERER_ANTIALIAS`（原先的死配置变活；简化档 WebGL2 走 MSAA，DPR=1 开销小）。
- `apps/web/src/rendering/GalleryRenderPipeline.tsx`：`buildPostFxOutput` 末尾接 three 自带 `fxaa()`（`three/addons/tsl/display/FXAANode.js`），`postFxEnabled` 条件纳入 `ENABLE_GALLERY_FXAA`（bloom 全关时管线也保活）。FXAA 只在完整档（管线只在 `profile.postProcessing` 时挂载）。

### 4. 色彩与令牌

- `apps/web/src/space/spaceVisualTokens.ts`：`colors` 新增 `inkOutline: "#17282a"`；**key 光位置 `[-8,5,6]` → `[-5,10,4]`**（仰角 ~27° → ~57°，影子从甩墙上变成落地面，第一轮手测调整；toon 分档方向随动，顶更亮墙更暗属预期）。
- `galleryConfig.ts`：`EXHIBIT_TARGET.emissiveColor` → `signal` 令牌（#ef8b61）、`emissiveIntensity` 0.06 → 0.35（hover 展品橙色高亮）。
- 未改任何既有 V2 令牌数值（除 key 光位置，V3 附录已记录 supersede）。

### 5. 玻璃存在感（第五轮手测）

- `galleryConfig.ts` 新增 `GALLERY_GLASS = { opacity: 0.55, frostedOpacity: 0.62 }`（GLB 导出值 0.32/0.42 太淡）。
- `galleryStyleMaterials.ts` 的 `applyGalleryPreservedMaterialStyle` 新增 `GLASS_` 分支：`applyGalleryGlassMaterial` 按**材质名**区分 frosted/clear；`opacity >= 1` 的不动（永不把不透明材质转透明）；材质数组逐槽处理不短路（`some()` 短路的坑）。

### 6. 配置总览（`galleryConfig.ts` 本轮新增/改动）

```ts
ENABLE_GALLERY_INK_OUTLINES = true
GALLERY_INK = { width: 0.035, color: inkOutline,
  exemptPatterns: [/^ARCH_WALL_PLASTER_WHITE_0(?:1[3-9]|2[0-2])/] }
ENABLE_GALLERY_RUNTIME_SHADOWS = true
GALLERY_SHADOW = { mapSize: 4096, normalBias: 0.06, bias: -0.0002, margin: 2 }
ENABLE_GALLERY_FXAA = true
GALLERY_GLASS = { opacity: 0.55, frostedOpacity: 0.62 }
EXHIBIT_TARGET = { emissiveColor: signal, emissiveIntensity: 0.35, ... }
```

## 六轮手测调优记录（用户真实 Chrome/Edge 反馈驱动）

1. 描线宽度 0.025 → 0.06 → **0.035**；floor/stair 免描边；key 光仰角 27° → 57°（影子落地）。
2. 阴影 `BasicShadowMap` → **`PCFShadowMap`**（硬锯齿被否）；墙面斑驳（shadow acne）修复：`normalBias` 0.05 → 0.2、包围球 → 光空间 AABB 拟合、贴图 2048 → 4096。
3. 天窗斜井齐平薄板（`ARCH_WALL_PLASTER_WHITE_013~022`，8cm 厚）墨壳穿透吊顶漏墨：按名豁免（`exemptPatterns`）+ 墨线材质 `polygonOffset(1,1)` 兜底。这些板的轮廓线交由铝框剪影和 toon 分色承担。
4. 竖条玻璃上印影子（"影子飘在玻璃前面"）：`GLASS_`/发光体 `receiveShadow` 也关掉。
5. 玻璃太淡衬不住投影：`GALLERY_GLASS` 0.55/0.62。
6. 转角两侧影子错开：`normalBias` 沿法线偏移导致垂直两面墙采样平移方向不同（0.2 = 20cm 错位太明显）→ 降到 **0.06**，补恒定 `bias: -0.0002`（沿光线方向、与法线无关，不产生转角缝）。

## 测试

新增 6 个测试文件（全部 TDD 先红后绿）：

- `apps/web/tests/space/gallery-ink-outline.test.mjs`（9 条：焊接/外扩/世界矩阵/合并/空输入/挂接豁免/幂等/配置/展品壳本地空间与 dispose）
- `apps/web/tests/space/gallery-shadow.test.mjs`（7 条：光空间拟合/配置/双门控/静态策略/LOD 刷新/玻璃发光体不投不接/灯泡不投）
- `apps/web/tests/space/gallery-antialiasing.test.mjs`（3 条）
- `apps/web/tests/space/gallery-accents.test.mjs`（1 条：hover signal 强度区间）
- `apps/web/tests/space/gallery-glass.test.mjs`（2 条：不透明度提升 + 数组不短路 + 不透明槽不动）

更新的既有契约：`scene-pipeline.contract-test.mjs`（cleanup 结构）、`visual-system.contract-test.mjs`（令牌集合 + key 光位置）、`runtime-profile.contract-test.mjs`（antialias 开关）。
`package.json` 的 `test:unit` 列表已收录全部新测试。
**`npm run verify:quick` 终态全绿**（lint + tsc + 全部单测/契约/release gates）。

## 验证状态与遗留

- headless（Playwright + SwiftShader）只能验简化档：描线、MSAA 已用 1080p 截图确认（session captures 目录有 before/after 对比）。完整档（阴影观感、FXAA、hover、展品壳 LOD）经用户六轮真实浏览器手测确认。
- **性能测量未跑**：`npm run performance:browser` 被一个**预先存在的问题**阻塞——当前 main（未改动的 `343d0e8` 原样复现）的生产构建在 headless 浏览器渲染空白（React 挂载但渲染空树，无报错；线上旧版与 `release/` 旧包均正常）。这不是本轮引入的，建议 Codex 优先排查（方向：近期 lobby/boot 改动对生产构建的影响；可用 release/LizzardKevin-Space-test 旧包做对照）。
- `xlsx` 根依赖曾缺失导致 verify 链起不来，已 `npm install` 修复（注意它是 SheetJS CDN tarball，换环境要重装）。
- headless SwiftShader 下见过 `bindTexture: deleted object` 警告刷屏（疑似环境噪音），原生浏览器未见，待确认。
- 阴影/FXAA/性能门槛的**原生验收**仍需按 V2 协议在真实 Chrome/Edge 跑一次：
  ```
  npm run build && npm run preview -w apps/web -- --port 4176
  node scripts/measure-space-browser-performance.mjs --base-url http://127.0.0.1:4176 --samples 3 --playwright-module <playwright路径> --output candidate.json
  ```
  对比 `docs/performance/space-browser-baseline.json`（V2 噪声带；注意基线本身有一项 rapier 预加载 gate 未过）。

## 可调参数速查（都在 `galleryConfig.ts`）

- 描线粗细/豁免：`GALLERY_INK.width` / `GALLERY_INK.exemptPatterns`（正则列表，定点拔除同类渗漏）
- 阴影：`GALLERY_SHADOW.mapSize/normalBias/bias/margin`；边缘风格在 `SpaceCanvasHost.tsx` 的 `shadows={{ type: PCFShadowMap }}`
- 光照角度：`spaceVisualTokens.ts` `lighting.key.position`
- 玻璃：`GALLERY_GLASS.opacity/frostedOpacity`
- hover：`EXHIBIT_TARGET.emissiveColor/emissiveIntensity`

## 建议的下一步

1. 排查 prod-boot headless 空白（见上，优先级最高——它阻塞性能门槛）。
2. 原生跑 `performance:browser` 前后对比，补记到 `docs/performance/`。
3. 若用户想要"手绘抖动"阴影边缘（非纯直轮廓）：需要自定义 TSL 阴影采样替换内置光照，改动面大，需单独立项评估。
4. `space_main_from rhino.glb` 的重导入流程（runbook：`docs/space-main-rhino-reimport-runbook.md`）走完后再复核描线/阴影在新几何上的表现（注意 bump `GALLERY_GLB_REVISION`）。
