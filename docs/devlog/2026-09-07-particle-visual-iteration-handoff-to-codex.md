# Thread Handoff: Kimi → Codex(滚动点云视觉系统 Phase 1-2 + 迭代批次)

时间:2026-09-07(Asia/Shanghai)
仓库:`LizzardKevin/lizzardkevin-space`
交接目的:让 Codex 接续推进 Profile(Phase 3/4/5)与 DevStories(Phase 6),并接收已完成的 WorkDetail / 开始页 Intro 全部上下文。

## 0. 权威基准与工作区状态

```text
分支   feat/scroll-particle-visual
HEAD   226eb1f(本地领先 origin/main 四个 commit,尚未 push)
origin/main  4f232b3
remote origin https://github.com/LizzardKevin/lizzardkevin-space.git
```

四个 commit:
1. `5af6a5e` Phase 1:离线采样器 + dev 标定路由
2. `48bc368` Phase 2:WorkDetail 全页粒子宿主 + 去框体改版
3. `03f62af` 开始页 3D 标题 shatter Intro + 全屏白场渐隐 + 弹幕 60fps
4. `226eb1f` 作品页:入场波浪 / 两段式 / 密文边缘导航 / 图集自动流 / ESC 指针锁兜底

开始前只读核对:`git rev-parse HEAD` / `git status --short --branch`;不一致就停下报告,不要 reset。
设计依据(仍在生效的总合同):`docs/devlog/2026-09-02-scroll-driven-particle-visual-handoff-to-kimi-k3.md`。
阶段记录:`docs/devlog/2026-09-02-particle-calibrator-phase1.md`、`2026-09-02-workdetail-particle-phase2.md`、`2026-09-05-lobby-shatter-intro-and-works-visual-iteration.md`。

### 严格保护范围(沿用并新增)

- 不装新依赖;复用现有 three/R3F/GSAP/Lenis。
- 高模/源文件不进 `apps/web/public`;正式 `space_main.glb`、Focus GLB 只读。
- 不降低 SPACE 的 4096 shadow;不给展品加墨边;不动移动端 Terminal。
- Lobby / SPACE HUD / Mobile 的 reduced-motion 保护不删;桌面滚动三页的 reduced-motion 移除是**后续阶段**的统一动作,本轮未做。
- 本机(E 盘 checkout)4 个未跟踪文件(`space_main_from rhino.glb/.glbbak`、`space_main.glbbak`、`BlenderFile/space_main.blend1`)禁止整理;它们会让本机 `asset:check` 与干净树基准不符,干净 checkout/CI 正常。

## 1. 已建成的粒子引擎(`apps/web/src/particles/`)

- `bake-particle-visual-cache.mjs`(scripts/):纯 Node 手工 GLB 解析,面积加权采样,mulberry32 确定性;PVB1 bin(36B 头 + N×7×f32:pos/normal/rand)。
- `particleCacheLoader.ts`:`particleCacheUrlFor(exhibitId)` 工厂(URL 模板只允许出现在此文件,契约有锁)。
- `particlePointsMaterial.ts`:TSL `PointsNodeMaterial` + instanced `Sprite`(**r184 下 Points 双后端锁 1px,唯一可控粒径路径**;所有实例属性必须 `new InstancedBufferAttribute` 包装,裸 TypedArray 会退化逐顶点——契约有锁);圆形点靠 `alphaToCoverage=true`(three 默认 false,必须显式开——契约有锁)。
- `ParticlePointsRenderer.ts`:普通 canvas 闭环;体积中心归零;程序化地面合并;包围球取景;`setMorphProgress`(0=成形 1=散开)、`startIntro`、`viewOffsetFactor`(getter/setter + 脏标记);帧路径零分配(实例复用 Spherical,收敛跳过相机重写);update 只写 uniforms。
- `groundPointField.ts`:半径 = 视距 × 4.76,25k 点,r=R·rand^0.75,径向 fade。
- `ambientPointField.ts` / `mergeParticleArrays.ts` / `introReveal.ts`:解构目标散布、数组合并、入场揭示纯函数(阈值 = 深度×0.5 + 高度×0.5 + 15% 抖动;2.2s;黄 #e8d44d → 灰阶)。

### 关键默认参数(真机标定通过)

pointSizeBase = 平均间距×0.5 自适应;cursorGain 1.0 / radius 0.25 NDC / 微放大 1.15× / jitter = 间距去零头×2;depthFade 按模型近远归一 amp 0.65;视差方位 ±30°(已反向)、俯仰 ±15°;散开态透明度 50%;twinkle 0.16/1.8、wave 0.12/0.55/波长 3/lift 0.015。

## 2. 页面现状

- **开始页**:3D 标题逐簇爆炸聚合(14 面/簇,202 块,seed 确定性,带回冲 ease);全屏白场 opacity 渐隐;弹幕 60fps;Enter/音频/pointer tilt 不变。
- **WorkDetail**:两段式(Hero 标题/简介/数据带/点云模型 → `#work-media` 视频+图集);解构锚定 `#work-media`(无媒体退化页尾);散开态 50% 透明;边缘密文导航(7×11 位图、无框、内移 16px、显词"上一件/下一件"、hover 原地解密);图集 32px/s 无缝自动流(拖拽/点击/Lightbox 协同);ESC 返回 SPACE 用 pointerdown 兜底恢复指针锁(ESC 无用户激活——已实证);入场波浪每次进入重播。
- **dev 工具**:`/dev/particle-calibrator`(全套 uniform query);作品页 `?wpMorph/wpGoto/wpIntro/px/py/wpPerf` 钩子,生产不生效。
- **未做**:Profile、DevStories、ASCII reveal、reduced-motion 移除。

## 3. 测试与验证纪律

- 新测试文件必须手动登记根 `package.json` 显式列表(node:test;契约测试裸 node)。
- 全量门槛:`npm run verify:quick && npm run build:chunks`;新增 public 资产后须重建 `docs/performance/space-asset-inventory.json`——**必须在干净树生成**(git archive 到临时目录 + 拷入新资产 + 拷入新 dist),否则本机未跟踪文件会污染基准。
- dist 不清空会残留旧 chunk 使 chunks 契约误报:构建前 `rm -rf apps/web/dist`。
- 无头验证:`"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --enable-unsafe-webgpu --use-webgpu-adapter=swiftshader --virtual-time-budget=N --screenshot=...`(仓库无 playwright;写截图后记得清理)。

## 4. 下一步(按交接文档 §16)

- **Phase 3 Profile 单组**:Hero 自由粒子场 → Education 汇聚 → 组内镜头插值;35% 左右交替阅读岛;文字纯文档流。**等用户的 Architecture 视觉源模型**(命名合同见 §8.1:`profile_act_01_architecture.visual-source.glb`,PV_ROOT + PV_SHOT_01/02_EYE/TARGET 节点;不进 public)。
- **Phase 4 三组 morph**:Livehouse、Culture/Lab 高模同样未供。
- **Phase 5 ASCII reveal**(仅 Group C,cursor 圆域,GPU 局部)。
- **Phase 6 DevStories**:DotGrid 吸附改亮度语义 + 灰黑玻璃 + 克制橙色 + 完整回归。
- 已知遗留:WebGL2 simplified 真机 fallback 未实测;`performance:browser` 桌面段选择器在 main 上已失配(未修);极端俯视差(py=−1)扁平模型相机可落到地面下(未修);canvas-ui(canvasui.dev)已收录为按需效果源——**接入配置在 89f7 worktree 未提交**,要用先让那边提交或移植配置。
