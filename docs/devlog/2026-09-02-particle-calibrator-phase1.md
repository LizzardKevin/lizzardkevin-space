# Phase 1 标定记录:Tree Habitat 点云视觉(2026-09-02)

依据交接文档 `docs/devlog/2026-09-02-scroll-driven-particle-visual-handoff-to-kimi-k3.md` §9/§16 完成 Tree Habitat 单模型点云视觉标定。本文件固化首轮已批准的视觉参数与关键实现决定。

载体:dev-only 路由 `/dev/particle-calibrator`(仅 `import.meta.env.DEV` 注册,生产落 NotFound)。

## 已批准参数(代码默认值,用户真机目视验收通过)

| 参数 | 值 | 说明 |
|---|---|---|
| pointCount | 50,000(模型)+ 25,000(地面) | 离线采样,seed 1234,确定性 |
| pointSizeBase | 0.05 世界单位 | 参考批准 Demo 约 2× 粒径 |
| brightnessBase | 0.8 | 法线 lambert(灯向 (0.35,0.75,0.55))× 深度衰减 |
| depthFade | near=视距−半径 / far=视距+半径,amp 0.65 | 按模型自身区间归一化,最远点压到 35% |
| twinkle | amp 0.16,freq 1.8 | 每点稳定随机相位 |
| 人浪 | waveAmp 0.12,waveSpeed 0.55,waveLength 3.0,waveLift 0.015 | 低频亮度带 + 极小 y 起伏 |
| cursorGain / cursorRadius | 1.0 / 0.25 NDC | 光标圆域增亮,柔和 falloff |
| cursorSizeGain | 0.15 | 圆域内最多放大 1.15× |
| cursorJitterAmp | 0.2(自动:平均相邻间距去零头 ×2) | ∛(bbox 体积/N)≈0.1002→0.1,×2 |
| 视差 | 方位 ±30°,俯仰 ±15°(基准 8.5°),lerp 3/s | 方位方向已按标定取反(光标右移→镜头左绕) |
| 地面 | 半径 60,25k 点,r=R·rand^0.75,fade=(1−r/R)^1.2 | 贴模型最低点,远缘溶解 |
| 自动旋转 | 无(已按用户决定移除) | 模型按包围盒中心(体积中心)归零静止 |

运行时标定 query:`size waveAmp waveSpeed twAmp cursorGain cursorRadius cursorSize depthAmp jitter parallax ground px py`(dev-only,无控制面板)。

## 关键实现决定

1. **instanced Sprite 而非 THREE.Points**:r184 节点体系下 Points 在 WebGPU/WebGL2 双后端均锁 1px(`GLSLNodeBuilder` 写死 `gl_PointSize`),粒径可控的唯一路径是 `new Sprite(new PointsNodeMaterial(...))` + `sprite.count = N`,每点数据经 instanced attribute 注入。
2. **InstancedBufferAttribute 包装是硬性的**:`instancedBufferAttribute()` 收裸 TypedArray 时 `createBufferAttribute` 末态返回不置 instanced 标记(`BufferAttributeNode.js` 仅 mat3/mat4 分支置位),属性退化为逐顶点读取,50k 实例挤在前 4 个点(症状:全黑 + 几片白三角)。必须 `new InstancedBufferAttribute(array, itemSize)` 后再传入。已由 `particle-calibrator.contract-test.mjs` 断言锁死。
3. **alphaToCoverage 默认 false**:three Material 默认关,圆点 mask 需显式 `material.alphaToCoverage = true`(契约断言锁定)。
4. **离线采样器零依赖**:纯手工 GLB 二进制解析(复用 `audit-space-assets.mjs` 字节表思路),三角面积加权 + mulberry32(seed 1234),同输入同 seed 输出 sha256 逐字节一致;源 GLB 只读(测试断言)。
5. **缓存格式 PVB1**:36 字节头(magic/version/pointCount/bounds)+ N×7×f32(px,py,pz,nx,ny,nz,rand)。Phase 1 未做量化,标定后再收紧(§19-13)。
6. **地面与模型同 buffer**:合并进同一批 instanced buffer,单次 draw call;`particleFade` 属性区分(模型=1,地面=径向渐暗)。

## 产出物

- `scripts/bake-particle-visual-cache.mjs` — 采样器(CLI:`--input/--output/--report/--count/--seed`)
- `apps/web/public/particles/arch_treehabitat.particles.bin` — 1,400,036 B(50k 点,sha256 `852902e8…`)
- `docs/performance/particle-bake-arch_treehabitat.report.json` — 采样报告(5295 退化三角形跳过;输入 sha256 `d2abc677…`)
- `apps/web/src/particles/` — `particleCacheLoader.ts`、`particlePointsMaterial.ts`、`ParticlePointsRenderer.ts`、`groundPointField.ts`
- `apps/web/src/pages/dev/ParticleCalibratorPage.tsx` — 标定页(全视口、canvas `pointer-events: none`、HUD、query 标定、失败降级占位)
- 路由:`routeConfig.ts` / `DesktopApp.tsx`(DEV 门控 lazy)/ `routeRuntimePolicy.ts`(与 /works 同级暂停 SPACE)
- 测试:`tests/particles/bake-particle-cache.test.mjs`(6 用例)、`tests/particles/particle-calibrator.contract-test.mjs`,均已登记进根 `package.json`

## 验证记录

- `verify:quick` / `build:chunks` / `asset:check` 全绿(多次复跑)。
- 无头 Chrome(SwiftShader WebGPU,1440×900)截图:点云成形、居中静止、地面铺满左/右/下三边、±30° 视差对称(方向反转后 `px=1` 与反转前 `px=-1` 逐字节一致)。
- 真机目视(用户):轮廓、粒径、灰阶、微闪/人浪、光标增亮/微放大/抖动、视差、地面——全部认可通过。

## 已知事项

- 本工作区 4 个未跟踪文件(`space_main_from rhino.glb/.glbbak`、`space_main.glbbak`、`BlenderFile/space_main.blend1`)会使本地 `asset:check` 与干净树基准不符;基准已在干净树(git archive)中重建,干净 checkout/CI 不受影响。交接文档禁止整理这些文件。
- main 旧基准遗留 14 张已删除的 onboarding PNG 且缺 `space_minimap_strip.glb`(main 上 `asset:check` 本就不绿);本次重建已修复。
- WebGL2(simplified profile)未做无头实测,instanced Sprite 在两后端的用法与官方示例一致,真机 fallback 待 Phase 2 回归覆盖。

## 下一步(Phase 2:WorkDetail 完整闭环)

按交接文档 §16:接入完整文字 Hero、scroll 解构为 ambient、上滚重组、保留媒体与返回 SPACE、移除旧可拖拽 viewer。门槛:无拖拽、可逆、正文可读、双击空白与 Pointer Lock 返回可靠、route 离开资源完全释放。
