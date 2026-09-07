# Phase 2 记录:WorkDetail 全页粒子宿主(2026-09-02)

依据交接文档 §5/§16 Phase 2 完成 WorkDetail 集成,并经真机目视验收通过。
Phase 1 标定记录见 `docs/devlog/2026-09-02-particle-calibrator-phase1.md`。

## 用户拍板(超出交接文档原文)

- WorkDetail 启用 ±30° 光标视差、保留粒子地面(与标定页视觉语言一致);
- 无自转;退役 `another_angle` 探索任务(不补发事件);
- 全屏粒子背景下去除线条/方框框体;底部玻璃导航保留特效、重排为单行细条;
- Hero 文字左上,粒子模型视觉中心右移 1/3 半径避让;
- 指针光晕不着色粒子,提示色放到指针本身的 outline。

## 交付内容

### 粒子宿主与页面集成
- `WorkParticleHost.tsx`:固定全视口点云背景(canvas `pointer-events:none`,z-index -1 垫在壳层滚动内容之下),Hero 即展台;滚动解构用 ScrollTrigger **绝对滚动位置驱动**(`start: 0`,end = overview 顶的内容坐标 − 25% 视口,函数式取值 refresh 重算)——scrollTop=0 恒成形,与创建时机/布局/进入路径无关;此前相对起点 + 初始进度重映射方案因 hero 仅 86vh 导致首屏即半解体,已废弃。
- `ScrollPageShell` 新增 `background?: "dotgrid" | "none"`(默认 dotgrid,Profile/DevStories 不变)。
- `WorkDetailPage`:删除 sticky 舞台与旧可拖拽 `WorkModelViewer.tsx`;粒子失败回退 video/poster 静态块(非 sticky);`key={exhibitId}` 防多 renderer generation。
- 三件作品粒子缓存全部烘培(各 50k 点,seed 1234,确定性);loader 改 `particleCacheUrlFor(exhibitId)` 工厂。

### 引擎扩展
- `morphProgress` uniform + `positionAlt` instanced 属性:模型点 → ambient 散布解构,地面点原位;`ambientDim 0.55` 让位正文;`setFallbackField()` 静态降级。
- `ambientPointField.ts`(x/z ±26,y −4.2~12 确定性散布)、`mergeParticleArrays.ts` 纯函数合并。
- **粒径自适应**:`pointSizeBase = ∛(bbox 体积/N) × 0.5`(Tree Habitat ≈0.05 标定值;小模型不再被固定世界单位放大成糊斑)。
- **`viewOffsetFactor`**:视觉中心右移(WorkDetail 0.33),相机与焦点同步平移,点云不变形、视差轨道不受影响;标定页保持 0。

### 视觉改版(仅 `.ark-work-page` 作用域)
- 去框体:分节序号去框、标签 chips 改 accent 中点分隔、数据带去格线只留顶部细规线。
- Hero 左上:eyebrow+标题+subtitle+数据带顶栏下起排;标题限宽 40vw、字号 `clamp(40px,5.4vw,96px)` 避让模型。
- 上一件/下一件:保留 ArkGlassTile 雾化玻璃,大卡片改单行细条(dir+title 同排)。
- CursorDot 默认态:6px 白点 → 12px 提示色 outline 细环(`color-mix(accent 75%)`,各页 accent 自适应);hover 26px 强环不变。

### another_angle 任务退役
任务池 9→8、传感器、i18n 文案、相关测试全清理;`work-model-dragged` 事件源随 WorkModelViewer 删除。

### 测试与契约
- 新增 `work-particle-host.contract-test.mjs`(canvas pointer-events、无 R3F、URL 只在 loader、WorkModelViewer 不复存、壳层默认背景 dotgrid);`ambient-field.test.mjs` 6 例。
- 改写 `runtime-profile`/`scene-pipeline`/`space-hud-widgets`/`runtime-boundaries`/`particle-calibrator` 契约的失效断言;quest 测试同步,全部登记进 `package.json`。

## 修复记录的 bug
1. 首屏半解体模糊柱(相对起点 + hero 86vh)→ 绝对滚动位置驱动(见上)。
2. 3D 打印模型粒径放大 6 倍 → 间距自适应(见上)。
3. 标定页 query 参数首载不生效(effect 顺序)→ boot 后统一应用初始参数。

## dev-only 测试钩子
`?wpMorph=0..1`(强制解构进度)、`?wpGoto=<分节id>`(跳分节)、`?px=&py=`(固定光标);标定页另有全套 uniform query。生产不生效。

## 验证
- `verify:quick` / `build:chunks` 全绿(每轮改动复跑);资产基准干净树 roundtrip 通过。
- 无头 Chrome(SwiftShader WebGPU)截图矩阵:三作品 Hero 成形、解构态、标题避让、粒径、去框体版式,全部通过。
- 真机目视(用户):标定视觉、解构可逆、版式、粒径、指针 outline,验收通过。

## 遗留
- WebGL2(simplified profile)真机 fallback 未实测,建议后续回归覆盖。
- `performance:browser` 桌面段选择器在 main 上已失配(`.focus-overlay` 等),未修,另立项。
- 本地 4 个未跟踪 GLB 文件仍使本机 `asset:check` 与干净树基准不符(老问题,干净 checkout/CI 不受影响)。
