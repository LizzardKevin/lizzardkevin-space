# Thread Handoff: Codex → Kimi K3（滚动驱动点云视觉系统）

时间：2026-09-02（Asia/Shanghai）  
仓库：`LizzardKevin/lizzardkevin-space`  
交接目的：让 Kimi K3 基于本轮已经批准的设计，先制作 Tree Habitat 单模型点云视觉标定 Demo，再按分阶段顺序推进 WorkDetail、Profile 与 DevStories。  
当前状态：**设计讨论完成；尚未实现、尚未安装依赖、尚未修改正式 3D 资产、尚未 commit / merge / push。**

---

## 0. 权威基准与工作区状态

本轮开始时只读核对结果：

```text
pwd
C:\Users\lizza\.codex\worktrees\c1f4\LizzardKevin SPACE

HEAD
4f232b318e055b185c6672bc5a1b5f94a15994f1

main
4f232b318e055b185c6672bc5a1b5f94a15994f1

origin/main
4f232b318e055b185c6672bc5a1b5f94a15994f1

remote
origin https://github.com/LizzardKevin/lizzardkevin-space.git
```

当时工作区为干净的 detached managed worktree。当前仅新增本交接文档；`.superpowers/` 下的 Visual Companion 临时文件已由 `.gitignore` 忽略，不是权威设计资产。

Kimi 开始施工前必须再次只读确认：

```powershell
Get-Location
git rev-parse HEAD
git rev-parse main
git rev-parse origin/main
git remote -v
git status --short --branch
```

如果基准不再一致，停止并向用户报告；不要 reset。

### 严格保护范围

- 不触碰 E 盘普通 checkout。
- 不触碰或整理未跟踪 Rhino / GLB / GLBbak、Blender/source assets。
- 不修改 `space_main.glb`、正式 SPACE 场景源、正式 Focus GLB，除非用户在后续施工中再次明确授权。
- 首个 Demo 只读使用现有 Tree Habitat Focus GLB 作为离线采样输入。
- 不混入 onboarding、DevLog 内容改写、SPACE 走廊、阴影或展品描边调整。
- 不降低 SPACE 的 4096 shadow 产品决定。
- 不给展品重新增加墨边。
- 不安装新依赖；当前批准架构明确优先复用现有 Three / R3F / GSAP / Lenis。

---

## 1. 本轮目标与最终结论

本轮讨论的原始目标是判断：

1. 展品详情页（WorkDetail）是否能把现有 3D 模型自然融入 scroll-driven 粒子背景；
2. 个人页（Profile）是否能用多个用户自建模型形成连续的滚动视觉叙事；
3. DevStories 是否需要 3D / ASCII，或只需要在 UI 语言上与新视觉系统一致；
4. 是否应共享一个粒子 / ASCII 引擎，还是每页做完全独立的视觉 Demo；
5. 用户自己的高模如何经过清晰、可控的作者工作流进入网页。

最终批准的总方向：

- **Profile 与 WorkDetail 共用同一个底层粒子引擎，但采用完全不同的页面编舞。**
- **DevStories 不加载 3D 粒子引擎，只保留现有 DotGrid 和三栏结构，并统一灰阶、玻璃、强调色与光标反馈。**
- 高模只作为离线制作输入；网页只加载固定预算的粒子缓存。
- 粒子跨模型重组由 GPU 根据滚动进度插值，CPU 不逐帧重写粒子数组。
- 所有新视觉仅作用于桌面体验；移动端 Terminal 完全保持现状。

推荐架构已经获用户批准：

> 离线粒子目标缓存 + 运行时 GPU 插值。

没有选择：

- 完整逐帧预渲染视频，因为它无法保留实时鼠标视差、局部高亮、ASCII 揭示与可逆滚动；
- 完整 VAT / 全时间轴纹理作为主方案，因为文件更大、调整滚动节奏和镜头更僵硬；
- 2D 深度图 / 序列帧伪 3D，因为无法满足真实视角和三维粒子 morph。

---

## 2. 已检查的现有项目结构

### 2.1 三页共享滚动壳

关键文件：

- `apps/web/src/scroll/ScrollPageShell.tsx`
- `apps/web/src/scroll/useLenisScroll.ts`
- `apps/web/src/scroll/useScrubSections.ts`
- `apps/web/src/scroll/useSectionReadProgress.ts`
- `apps/web/src/scroll/useScrollTriggerRefresh.ts`
- `apps/web/src/scroll/DotGridAttractCanvas.tsx`
- `apps/web/src/styles/scroll-pages.css`
- `docs/design/scroll-pages-motion-spec.md`

当前事实：

- 三个桌面滚动页面都使用 `ScrollPageShell`。
- 实际滚动容器是 `.ark-scroll`，不是 window/body。
- Lenis 与 ScrollTrigger 已联动。
- 背景当前由一个 2D Canvas `DotGridAttractCanvas` 承担。
- DotGrid 常驻约 30fps，拥有自主流场、呼吸、鼠标吸附和切页箭头。
- `useScrubSections` 是旧 pin 方案的替代；旧整节 pin 因 sticky 数字轨下移和画面僵硬被删除。
- 新方案不得重新引入整节硬 snap / pin。用户明确选择连续滚动、线性 scrub。

### 2.2 Profile 与 DevStories 的常驻双面板

关键文件：

- `apps/web/src/pages/archive/ArchiveHub.tsx`
- `apps/web/src/pages/profile/ProfileContent.tsx`
- `apps/web/src/pages/devstories/DevStoriesContent.tsx`
- `apps/web/src/components/ArkGlassTile.tsx`

当前事实：

- `/profile` 与 `/devstories` 渲染同一个 `ArchiveHub`，仅 tab prop 不同。
- Profile 与 DevStories 两个面板同时常驻 DOM。
- 非活动面板用 absolute / visibility 隐藏，而不是卸载。
- 两页 scrollTop 已分别记忆，并通过 Lenis scroll bus 恢复。
- 切页动画完成后会刷新 ScrollTrigger。

这直接决定了新粒子生命周期：

- Profile ↔ DevStories 互切时，Profile Particle Host 必须**暂停并隐藏**，不能销毁。
- 返回 Profile 时恢复此前镜头、当前模型、morph progress、time phase 与 scrollTop。
- DevStories active 时，Profile Particle Host 停止帧循环；DotGrid 恢复。
- Profile active 时，DotGrid 停止并隐藏；Particle Host 恢复。
- 只有离开整个 ArchiveHub 时才释放 Profile 粒子资源。

用户明确纠正并批准了这一暂停策略。

### 2.3 当前 WorkDetail

关键文件：

- `apps/web/src/pages/works/WorkDetailPage.tsx`
- `apps/web/src/pages/works/WorkModelViewer.tsx`
- `apps/web/src/pages/works/useWorkDetail.ts`
- `apps/web/src/pages/works/useDragScroll.ts`

当前事实：

- `WorkDetailPage` 保留 Hero、作品标题、subtitle、数据带、媒体、Overview、视频、Gallery、Story、Spec、上下篇导航和 Lightbox。
- 当前 3D 展台由独立 `WorkModelViewer` R3F Canvas 渲染。
- `WorkModelViewer` 使用 OrbitControls，自动旋转；首次拖拽后停止。
- 当前展台为 sticky 区域。
- WorkDetail 允许双击页面空白处返回 SPACE，并同步恢复 Pointer Lock。
- 双击空白逻辑排除链接、按钮、媒体、图片、canvas、顶栏和底栏。

新方案中：

- 旧 `WorkModelViewer` 不再作为独立可拖拽查看器存在。
- 一个全页 Particle Visual Host 同时承担 Hero 点云展台和后续低密度环境场。
- Canvas 必须 `pointer-events: none`，以保持空白双击返回 SPACE 的可靠性。
- 作品媒体和文本结构仍保留。

### 2.4 persistent SPACE 与 Pointer Lock

关键文件：

- `apps/web/src/app/DesktopApp.tsx`
- `apps/web/src/space/PersistentSpaceHostBoundary.ts`
- `apps/web/src/space/SpaceHost.tsx`
- `apps/web/src/space/SpaceCanvasHost.tsx`
- `apps/web/src/space/requestSpacePointerLock.ts`
- `apps/web/src/space/routeRuntimePolicy.ts`

当前事实：

- SPACE 主 Canvas 跨路由常驻。
- 进入 Work/Profile/DevStories 时，主 Canvas 暂停，音频按现有 policy 暂停。
- 返回 SPACE 时，`DesktopApp` 通过同步 state commit 与 pointer-lock request 保持用户激活。
- 新粒子背景不得复用 SPACE 主 Canvas，也不得改变上述返回时序。
- WorkDetail / Profile 的局部 Canvas 是滚动页自己的 renderer；SPACE 主 Canvas 继续按既有策略独立暂停。

### 2.5 Renderer 与 fallback

关键文件：

- `apps/web/src/rendering/createWebGPURenderer.ts`
- `apps/web/src/rendering/rendererProfile.ts`
- `apps/web/src/rendering/rendererLifecycle.ts`
- `apps/web/src/space/SpaceCanvasHost.tsx`

当前事实：

- `createWebGPURenderer` 使用 Three `WebGPURenderer`。
- full profile 为 WebGPU、DPR 最高 2、带 post processing / shadows。
- simplified profile 为强制 WebGL2、DPR 1、不挂 SPACE shadow/post。
- 初始化时会处理 WebGPU entry-point 兼容并回退 WebGL2。
- 新粒子宿主应复用该 renderer/fallback 思路，而不是新增完全独立的兼容体系。

### 2.6 现有 3D 资产事实

当前三个 Focus GLB 大约：

- Tree Habitat：约 5.92 MiB，报告约 143,390 triangles。
- UABB：约 5.81 MiB，报告约 128,261 triangles。
- 3D Printing Architecture：约 6.93 MiB，报告约 144,740 triangles。

正式 exhibit 管线当前预算：

- SPACE 模型目标不超过 50k triangles。
- Focus 模型目标不超过 150k triangles。

新粒子视觉源不受网页三角面运行时预算约束，因为它只在离线阶段读取；但高模仍会影响离线转换时间与源文件管理。最重要的规则是：**高模不可放入 public shipping 路径。**

---

## 3. 视觉参考与用户最终选择

### 3.1 Moonshot AI

参考：

- https://www.moonshot.cn/

实看结论：

- 首屏是黑色留白、单一水平文字带与中央透镜/引力焦点；
- 规则很少，更像一件简单 digital artwork，不是多层复杂 ASCII 背景。

该参考帮助把早期“fancy ASCII 力场”收敛为“一件规则简单、焦点明确的 digital artwork”。随后用户提供 Unseen 作为更直接的 3D 交互参考。

### 3.2 Unseen Studio

参考：

- https://unseen.co/

实看结论：

- 全视口 3D 场景；
- 水面/材质保持自主运动；
- 鼠标主要引起整幅场景的低幅 camera/parallax 位移；
- 圆形 cursor 很克制；
- 并不是把附近粒子大幅吸向鼠标。

用户最终采用的转译：

- 灰阶 3D 点云；
- 鼠标轻微影响场景视角；
- 鼠标附近只提升粒子亮度，不改变粒子位置；
- 只有 Profile 的 Culture / Experiments 组，在 cursor 小圆域内切换成 ASCII“底层代码视图”。

### 3.3 已批准的点云 Demo

实时案例：

- https://kshitij978.github.io/Three.js-Point-cloud-morphing-effect/

源码：

- https://github.com/Kshitij978/Three.js-Point-cloud-morphing-effect

用户明确反馈：

- 认可该 Demo 的点云轮廓、自动旋转和模型 morph 效果；
- 可以直接作为视觉参考；
- 不需要比 Demo 更密；
- 不需要更小粒子；
- 粒子甚至应先尝试约 Demo 的 2× 直径；
- 移除强鼠标吸附；
- 移除控制面板；
- 鼠标移动时，只让对应小范围粒子亮一些。

注意：“约 2×”是首轮视觉标定起点，不应未经目视验证就固化成永久常量。

---

## 4. Profile 最终批准设计

### 4.1 页面结构

Profile 由：

1. Hero；
2. 六个现有内容板块；
3. 现有 Links 区域；
4. 一个全视口常驻 Particle Visual Host；
5. 六个随正常文档流滚动的阅读岛；
6. 三个视觉模型组。

### 4.2 Hero

Hero 最终要求：

- 背景不是已成形模型，而是自由流动、漂浮的粒子场；
- 即使鼠标不动，也持续运行自主 animation；
- 有随机/稳定种子驱动的微闪明暗；
- 有低频、轻微的“体育场人流庆祝波动”：
  - 可表现为宽波段的亮度变化；
  - 可带极小垂直位移；
  - 不得破坏整体可读轮廓；
- 鼠标移动会让整个自由粒子场产生低幅 camera/parallax 位移；
- cursor 附近粒子亮度略增，但粒子不被吸走；
- Hero 前景保留并强化最基础个人信息：
  - LizzardKevin；
  - 基础身份/工作方向；
  - 地点；
  - 简短个人介绍；
  - 联系方式 / GitHub 等；
- Hero 文字处于正常文档流，向下滚动时自然从画面上方离开；
- 不给 Hero 文字做单独 opacity 动画。

### 4.3 六板块与三组模型

现有六板块：

1. Education
2. Architecture
3. Photography
4. Music / Band
5. Anime / Culture
6. Other / Experiments

最终分组：

#### Group A：Education / Architecture

- 使用同一个 Architecture 模型。
- Education：更远、更完整的建立镜头。
- Architecture：同模型拉近并切换角度。
- 01→02 不碎裂、不更换模型、不改变视觉材质。
- 仅按滚动线性插值 camera angle、distance 与视觉中心。

#### Group B：Photography / Music

- 使用同一个大型 Livehouse 场所模型。
- Photography：更远的场所/空间建立镜头。
- Music：拉近到舞台、观众或演出焦点。
- 03→04 不碎裂。
- Livehouse 的“大”主要通过镜头、构图、空间范围和点云分布表达，不通过运行时加载高面数表达。

#### Group C：Culture / Experiments

- 使用第三个 Culture/Lab 模型。
- 05 与 06 为同模型的两个镜头。
- 三组共享 cursor 视角轻微转动与局部发亮。
- **只有 Group C** 额外启用 cursor 小圆域 ASCII reveal。
- ASCII 不是整页替换，也不是把粒子吸走。
- ASCII 字符词汇采用混合语言：
  - 常规密度字符，例如 `. : - = + * # % @`；
  - 少量品牌字母/词，例如 `L`、`K`、`SPACE`；
  - 可混入既有 HUD 符号。
- 圆域外仍为灰阶点云模型。

### 4.4 阅读岛

最终要求：

- 每个内容板块拥有一个阅读岛；
- 阅读岛宽度为视口约 35%；
- 六章左右交替：
  - 01 left
  - 02 right
  - 03 left
  - 04 right
  - 05 left
  - 06 right
- 阅读岛不是完全实心矩形；
- 使用黑色半透明渐变：
  - 靠页面外缘/文字侧较深；
  - 朝模型方向逐渐透明；
- 渐变透明度是固定样式，不参与 scroll opacity 动画；
- 模型视觉中心自动偏到阅读岛对侧的约 65% 可用区域；
- 组内镜头切换时，视觉中心也随 scroll 线性移动到新阅读岛对侧。

### 4.5 文字滚动规则：最终 V3

这里有一个重要的后续覆盖：

早期讨论曾提出：

```text
旧文字渐隐 → 模型移动 / morph → 新文字渐显
```

该规则已被用户明确撤回。

最终规则：

- 文字与阅读岛完全处于正常文档流；
- 只保留真实滚动位移；
- 不使用 `opacity` tween；
- 不使用 `autoAlpha`；
- 不使用额外的文字 `transform` tween；
- 旧阅读岛随页面向上滚出；
- 新阅读岛自然从视口下方向上进入；
- 左右阅读岛可在交界处短暂同时出现；
- 画面不应人为制造完全无文字的阶段；
- 背景视觉只读取 section 的真实位置，不能操纵文字。

换句话说：

```text
text/layout = normal document flow
visual progress = derived from measured section positions
visual ease = none
```

### 4.6 Hero→01、组内与跨组动画

#### Hero → Education

- 自由粒子场随着 Hero 文字上滚逐渐汇聚成 Model A；
- Education 阅读岛同时从下方进入；
- 汇聚进度与 Hero / Education 的实际 section boundary 线性绑定；
- 向上滚动时 Model A 反向解构回自由粒子场。

#### 组内

- 01→02、03→04、05→06：
  - 模型 target 不变；
  - 不碎裂；
  - 不变换材质；
  - 只改变 camera pose、distance 和左右 visual center；
  - 全部 `ease: none`，进度来自滚动位置。

#### 跨组

- 02→03、04→05：
  - 同一组粒子从旧模型 target 直接迁移到新模型 target；
  - 中间形成流动点场；
  - 不是旧模型先完全消失、再生成新批粒子；
  - 不是大块碎片动画；
  - 向上滚动必须沿同一路径完全可逆；
  - 粒子 ID 必须稳定、一一对应。

### 4.7 Profile 鼠标规则

三组统一：

- 鼠标产生低幅场景视角转动 / parallax；
- cursor 小范围粒子亮度略增；
- 不改变粒子位置；
- 不做吸附、排斥、尾迹或涡旋。

Group C 额外：

- cursor 圆域内点云切换为 ASCII code art；
- 圆域应小、边缘柔和；
- ASCII reveal 像“光标揭开网站底层代码”，不是独立背景层。

---

## 5. WorkDetail 最终批准设计

### 5.1 一个全页粒子宿主

- Profile 与 WorkDetail 共享引擎代码，但不是同一个同时运行实例。
- WorkDetail 用 Particle Visual Host 替换：
  - `ScrollPageShell` 的 DotGrid；
  - `WorkModelViewer` 的独立可拖拽 Canvas。
- 不叠加 DotGrid + WorkModelViewer + Particle Host 三层 runtime。
- WorkDetail 的粒子 Canvas 位于正文下方，`pointer-events: none`。

### 5.2 WorkDetail Hero

Hero 除高密度点云模型外，必须明确保留：

- eyebrow；
- 作品标题；
- subtitle（有数据才显示）；
- EXHIBIT / TYPE / INDEX 数据带；
- scroll hint；
- 滚过 Hero 后的 mini-title。

前景文字优先级高于背景点云。必要时使用克制的黑色半透明渐变保证可读，但不要做成不透明大卡片。

### 5.3 模型状态

- 模型以纯点云形式出现，不渲染实体 mesh surface；
- 点密度直接参考已批准 Demo；
- 首轮粒径约为 Demo 的 2×；
- 点云仍应清楚读出模型轮廓；
- 粒子保持自主微闪和低频波动；
- 模型自动缓慢旋转；
- 删除 OrbitControls 拖拽；
- 不提供控制面板；
- 鼠标不吸引、排斥或移动粒子；
- cursor 小范围只提升粒子亮度；
- WorkDetail 不启用 Profile 的 camera/parallax 和 ASCII reveal。

### 5.4 滚动解构

- 模型在 Hero / 展台状态保持成形并自动旋转；
- 当滚动离开 Hero、开始进入 Overview 时，模型按滚动线性解构；
- 解构目标为低密度环境点场；
- 低密度点场贯穿 Overview、Video、Gallery、Story、Spec 与上下篇导航；
- 后续正文仍是主层，粒子不得抢阅读；
- 上滚时完全可逆地重组模型；
- 模型恢复完整后继续自动旋转；
- 自动旋转与滚动 morph 不应同时争夺同一 transform：
  - 建议把旋转作为模型局部坐标或 shader 中的独立 uniform；
  - morph progress 接近完整模型时生效；
  - 解构阶段逐步降低旋转的视觉权重。

### 5.5 现有内容与返回流程

必须保留：

- 图片与视频；
- Gallery 横向拖动；
- ImageLightbox；
- Overview、Story、Spec；
- 上一件/下一件；
- 顶栏、底栏；
- ESC 与按钮返回 SPACE；
- 双击空白返回 SPACE；
- 返回后同步 Pointer Lock 恢复。

新 Canvas 不得吞掉双击事件。

---

## 6. DevStories 最终批准设计

DevStories 不引入模型、Particle Host 或 ASCII。

保持：

- 当前三栏 Built / Trouble / Next；
- 左侧 sticky 序号；
- period；
- 阅读进度 rail；
- tags；
- Reveal；
- section scrub；
- Lenis 连续滚动；
- Profile ↔ DevStories 各自 scrollTop 记忆；
- 所有现有 DevStories 内容与数据源。

只做视觉统一：

- 保留现有 2D DotGrid；
- DotGrid 保持自主流动与呼吸；
- 取消 cursor 导致的粒子位置吸附；
- cursor 小范围只提升点阵亮度；
- 玻璃面板更灰黑、更半透明；
- 继续直角工业语言；
- 橙色只用于 period、Trouble、阅读进度和局部反馈；
- 不把 DevStories 改造成 Profile 同款左右阅读岛；
- 不在 DevStories 上叠加大面积 3D runtime。

---

## 7. 共享粒子引擎边界

建议逻辑组件（名称可在实施计划中调整）：

```text
ParticleVisualHost
├─ ParticleRenderer
├─ ScrollTimelineController
├─ CameraComposer
├─ CursorLightField
├─ AsciiRevealPass        # 仅 Profile Group C 开启
├─ ParticleAssetLoader
└─ LifecycleOwner
```

### ParticleRenderer

- 使用一个 point draw call 为主要目标；
- 点集固定长度；
- 每个模型目标为等长 position buffer；
- shader 根据 `morphProgress` 在两个目标之间插值；
- 灰阶亮度来自网页灯光、法线、深度、随机种子与 cursor 圆域；
- 不从原模型材质/贴图取色；
- 点大小为运行时参数；
- 首轮从参考 Demo 约 2× 粒径开始标定。

### ScrollTimelineController

- 绑定 `.ark-scroll`；
- 不读取 window scroll；
- 从相邻 section 的真实位置计算规范化 `progress`；
- 使用线性 `ease: none`；
- 不操纵 Profile 文字 opacity/transform；
- Profile：
  - Hero→01 = free field→Model A；
  - 组内 = camera interpolation；
  - 跨组 = target buffer morph；
- WorkDetail：
  - Hero→Overview = model→ambient field；
  - Overview 之后维持 ambient target。

### CameraComposer

- Profile cursor 提供低幅 parallax；
- 阅读岛 left 时 visual center 自动偏 right；
- 阅读岛 right 时 visual center 自动偏 left；
- 每个模型两个 authored shot 为基础；
- 页面自动偏移与 authored camera pose 合成；
- WorkDetail 不使用该 parallax，只保留自动旋转与 framing。

### CursorLightField

- 不做 particle position force；
- 只提供：
  - cursor NDC；
  - 局部亮度增量；
  - 柔和 falloff；
- Profile 三组可用；
- WorkDetail 可用；
- DevStories 在 2D DotGrid 中实现同语义；
- Profile Group C 额外把该圆域传给 ASCII pass。

---

## 8. 模型作者工作流与命名合同

用户选择了“半自动”工作流，但随后进一步确定：

- 最终粒子统一灰色；
- 不需要材质/贴图烘焙；
- 不需要顶点色；
- 不需要手工点云；
- 不需要主动减面；
- 用户会在模型里放置命名镜头/目标节点；
- 具体镜头方向、焦距和构图方法由后续施工线程再指导。

### 8.1 Profile 三个视觉源

建议命名：

```text
profile_act_01_architecture.visual-source.glb
profile_act_02_livehouse.visual-source.glb
profile_act_03_culture_lab.visual-source.glb
```

每个模型建议节点：

```text
PV_ROOT
├─ visible meshes...
├─ PV_SHOT_01_EYE
├─ PV_SHOT_01_TARGET
├─ PV_SHOT_02_EYE
└─ PV_SHOT_02_TARGET
```

语义：

- `PV_ROOT`：参与粒子采样的视觉根；
- `PV_SHOT_01_EYE`：组内第一个章节的镜头位置；
- `PV_SHOT_01_TARGET`：第一个章节注视点；
- `PV_SHOT_02_EYE`：第二个章节的镜头位置；
- `PV_SHOT_02_TARGET`：第二个章节注视点。

注意：

- 横向避让阅读岛由网页自动叠加，不要求用户手动把镜头硬偏到边缘；
- authored shot 主要定义角度、距离与空间叙事；
- Livehouse 必须通过远近两个 shot 清楚表达“场所尺度→演出焦点”。

### 8.2 输入要求

- GLB 可为高面数；
- 可见 mesh 默认采样；
- 隐藏、辅助或不参与视觉的几何应通过清晰命名或 exclude 配置排除；
- 变换必须在离线工具中正确应用；
- 材质、纹理、贴图、灯光不进入最终点缓存；
- 法线应可用；若源法线缺失，离线工具可重算法线；
- 源模型不放入 `apps/web/public`。

### 8.3 离线采样

建议：

- 按三角形表面积加权采样；
- 使用稳定 seed；
- 为同一输入产生确定性输出；
- Profile 三个模型输出同一 pointCount；
- 粒子 ID 稳定；
- 输出包含：
  - 量化 position；
  - normal；
  - stable random seed / phase；
  - bounds；
  - camera / target；
  - format version；
- 输出检查报告：
  - pointCount；
  - bytes；
  - bounds；
  - mesh count；
  - camera node completeness；
  - excluded mesh；
  - invalid / degenerate triangle warning；
  - output hash。

### 8.4 运行时资产

建议形态：

```text
*.particles.bin
particle-visuals.manifest.json
```

最终编码、量化与路径由实施计划决定；不要在未测实际模型前过早锁定自定义格式细节。

### 8.5 WorkDetail 输入

- WorkDetail 可从独立视觉源生成粒子缓存；
- 不覆盖正式 `focus_<id>.glb`；
- 不覆盖正式 `space_<id>.glb`；
- 首个标定 Demo 例外：只读使用现有 Tree Habitat Focus GLB 作为输入。

---

## 9. 首个 Demo：Tree Habitat 单模型视觉标定

用户明确指定第一个 Demo 使用：

```text
apps/web/public/exhibits/arch_treehabitat/focus_arch_treehabitat.glb
```

该文件只能作为只读输入。

### 9.1 Demo 目标

先证明以下最小闭环：

1. 从现有 Focus GLB 离线采样固定点集；
2. 以纯点云显示 Tree Habitat；
3. 点密度直接参考批准的在线 Demo；
4. 粒径从在线 Demo 约 2× 起调；
5. 统一灰色；
6. 自动旋转；
7. 鼠标不改变点位置；
8. cursor 小范围提高亮度；
9. 无任何用户控制面板；
10. 有 cursor 静止时仍运行的微闪与人浪波动；
11. 验证 WebGPU 与 WebGL2；
12. 记录 pointCount、GPU/CPU 帧时间、传输大小与显存/内存趋势。

### 9.2 Demo 不应提前包含

- Profile 六章节；
- 三模型 morph；
- Livehouse；
- Culture/Lab；
- ASCII reveal；
- DevStories 改版；
- WorkDetail 全文结构重构；
- 新依赖；
- 正式 asset 替换。

### 9.3 Demo 推荐载体

优先做隔离的开发标定面，避免在视觉参数未确认前重写生产 WorkDetail。

可选做法由 Kimi 的实施计划决定：

- dev-only visual calibrator route；
- 仅开发环境挂载的独立 preview component；
- 用户明确同意后，才直接临时接入 `/works/arch_treehabitat`。

无论哪种方式：

- 不修改源 GLB；
- 输出粒子缓存应可删除/重建；
- Demo 参数应可快速调整；
- 不把控制面板带入最终产品；开发标定时若需要临时参数控制，必须 dev-only。

---

## 10. Renderer、性能与兼容合同

用户已批准：

### 10.1 Renderer

- 复用现有 WebGPU→WebGL2 fallback 逻辑；
- 不新增另一套复杂 runtime；
- 不安装新依赖；
- Profile / WorkDetail 的粒子宿主可以使用现有 R3F/Three 基础；
- WebGPU full：
  - 完整点集；
  - DPR 最高 2；
- WebGL2 simplified：
  - 全部动画仍执行；
  - DPR 1；
  - 必要时使用稳定子集降低 pointCount；
  - 不能改成静态图。

### 10.2 每帧更新

CPU 每帧只更新少量 uniforms：

- `time`；
- `scrollProgress`；
- `morphProgress`；
- `cameraPoseProgress`；
- `cursorNdc`；
- `cursorLightStrength`；
- `asciiRevealStrength`；
- 当前/下一目标索引。

禁止：

- 每帧在 JavaScript 遍历全部粒子；
- 每帧重建 `BufferGeometry`；
- 每帧重写完整 `BufferAttribute`；
- 为 cursor 做逐点 CPU 距离计算；
- 多个重叠 Canvas 各自常驻 rAF。

### 10.3 性能目标

初步验收目标：

- 原生桌面 / WebGPU：优先 60fps；
- WebGL2 fallback：稳定不低于 30fps；
- 1440×900、DPR 1/2 分别验证；
- scroll 时无明显 main-thread long task；
- Profile paused 时无持续帧循环；
- DevStories active 时不加载/运行 Profile 粒子更新；
- WorkDetail 离开后 GPU buffer / material / renderer 正确释放；
- 粒子资产只在进入对应页面后请求，不移动到 eager shell。

### 10.4 微动画

常驻微动画必须在 shader 内完成：

- 稳定随机 twinkle；
- 低频 brightness wave；
- 极小点大小变化；
- 可选极小垂直波动；
- cursor 静止也运行；
- 不允许波幅破坏模型结构；
- Profile paused 时停止时间推进或保存 phase；
- 恢复时不应出现突然跳相。

### 10.5 ASCII

- 只在 Profile Group C 开启；
- 应使用局部 screen-space 圆形 mask；
- 不对整屏执行高成本字符布局；
- 优先 glyph atlas / shader lookup 或等价 GPU 方案；
- 圆域外不增加额外 pass 成本；
- 字符密度可由点深度/亮度驱动；
- 不做 DOM 字符海洋。

---

## 11. 生命周期与加载

### 11.1 ArchiveHub

```text
Profile active
  Particle Host: running + visible
  DotGrid: paused + hidden

DevStories active
  Particle Host: mounted + paused + hidden
  DotGrid: running + visible
```

需要保留：

- Profile scrollTop；
- DevStories scrollTop；
- Profile current act；
- current shot；
- morph progress；
- cursor smoothing state（可安全重置，但不得引起跳变）；
- ambient time phase；
- GPU point buffers。

离开整个 ArchiveHub：

- remove listeners；
- cancel rAF / ticker；
- dispose geometry；
- dispose materials；
- dispose glyph atlas / render targets；
- dispose local renderer；
- clear loader references。

### 11.2 WorkDetail

- 只加载当前作品粒子缓存；
- route 变化时完全 dispose；
- 切换 prev/next work 不得保留错误的 point target；
- 快速来回进入同一作品不得产生多 renderer generation；
- 返回 SPACE 过程中 canvas 必须立即停止输入和动画。

### 11.3 资源加载

Profile：

- Hero 可先以 procedural free field 立即显示；
- Model A 优先加载；
- Model B / C 在 idle 或接近下一组时预载；
- 一旦加载，在 ArchiveHub 生命周期内保留；
- 不在 SPACE 首页、Mobile 或 DevStories 冷启动时请求。

WorkDetail：

- 当前 exhibit 粒子缓存懒加载；
- 失败时正文和现有图片/视频仍可用；
- 不阻塞页面顶栏与返回 SPACE。

---

## 12. 错误与降级

### Profile 粒子资产失败

- Hero procedural free field 仍可显示；
- 正文与阅读岛必须完整可读；
- 单一模型失败时：
  - 不阻塞后续章节；
  - 可保持 ambient field 或前一可用目标；
  - 记录可诊断错误；
- 不显示覆盖全文的错误页。

### WorkDetail 粒子资产失败

- 保留现有图片、视频和文本；
- 若无其他媒体，显示静态低密度 procedural field；
- 返回 SPACE 必须继续工作。

### WebGPU 初始化失败

- 使用现有策略进入 WebGL2；
- 保留全部动画语义；
- 从当前 scroll progress 恢复。

### 运行中设备丢失

- 最多尝试一次 local renderer rebuild / WebGL2 fallback；
- 避免无限重试；
- 失败后回到可读静态/ambient 状态；
- 不影响 persistent SPACE 自己的 renderer generation 与恢复逻辑。

---

## 13. reduced-motion 与移动端：用户明确决定

### reduced-motion

用户明确选择：

- 新粒子系统不做 reduced-motion 版本；
- 连当前桌面三页已有 reduced-motion 降级也移除；
- 所有桌面用户执行完整版动画。

实施范围只限桌面滚动三页相关逻辑。

注意现有代码中相关位置包括但不限于：

- `useLenisScroll.ts`
- `useScrubSections.ts`
- `useSectionReadProgress.ts`
- `Reveal.tsx`
- `ScrollPageShell.tsx`
- `DotGridAttractCanvas.tsx`
- `ArkGlassTile.tsx`
- `WorkDetailPage.tsx`
- `scroll-pages.css` 的 reduced-motion media query

不要误删 Lobby、SPACE HUD、Mobile Start Menu 等其他区域的 reduced-motion 保护。

这是一个明确的产品决定，也意味着桌面三页不再尊重系统“减少动态效果”偏好。如实施者对此有异议，应向用户提出，不可擅自恢复或扩大移除范围。

### 移动端

用户明确选择：

- 这套 Profile / WorkDetail 粒子视觉只做桌面；
- MobileApp / MobileExperience / Terminal UI 保持现状；
- 移动端不加载粒子资产；
- 不做静态图、循环视频或简化交互替代；
- DevStories 在当前移动路由中本就不呈现，保持现状。

---

## 14. DevStories 与 DotGrid 的互斥

当前 `ScrollPageShell` 无条件挂载 DotGrid。实施时要把背景所有权改为 route/tab aware：

- Profile：Particle Host active，DotGrid paused/hidden；
- DevStories：DotGrid active，Particle Host paused/hidden；
- WorkDetail：Particle Host active，DotGrid 不运行；
- 其他不相关页面：不受影响。

DevStories 的 DotGrid 修改：

- 保留自主流场和呼吸；
- 删除 cursor position attraction / offset；
- cursor 只提高局部亮度；
- 保留 switch strip arrow 是否继续使用点阵位移/放大，需要实施时谨慎核对：
  - 用户只明确取消 cursor 对点位置的吸附；
  - profile↔devstories 的切页箭头可继续作为 UI 状态；
  - 不应把箭头逻辑误删。

---

## 15. 与现有设计文档的冲突 / 需要更新的合同

`docs/design/scroll-pages-motion-spec.md` 当前写有：

- 不做多层 parallax；
- 不做无限循环装饰性微动画；
- reduced-motion 下关闭 Lenis/GSAP；
- WorkDetail 3D 展台 autoRotate；
- 当前 DotGrid 与现有页面结构。

本轮批准设计对 Profile / WorkDetail 明确 supersede：

- Profile 使用低幅 cursor parallax；
- Profile / WorkDetail 使用常驻微闪与人浪；
- 桌面三页移除 reduced-motion 降级；
- WorkDetail 取消拖拽 viewer，改为全页点云宿主；
- Profile / WorkDetail 不再使用 DotGrid。

DevStories 仍基本沿用旧结构，只改 DotGrid cursor 语义与视觉样式。

施工时必须同步更新相关 design contract / tests，避免旧测试把新方案当回归。但不要在首个单模型视觉标定 Demo 阶段就大范围重写全部合同；应按原型阶段逐步调整。

---

## 16. 推荐实现阶段与验收门槛

用户已批准以下顺序，并补充首个模型来源。

### Phase 1：Tree Habitat 单模型点云视觉标定

范围见第 9 节。

门槛：

- 轮廓清楚；
- 粒子明显可辨；
- 粒径约参考 Demo 2× 起调；
- 灰阶层次可读；
- 无鼠标位置吸附；
- cursor 小范围亮度提升；
- 自动旋转；
- 自主微闪与人浪；
- WebGPU 优先 60fps；
- WebGL2 稳定 30fps；
- GLB 未修改；
- 输出缓存可重建。

### Phase 2：WorkDetail 完整闭环

- 接入完整文字 Hero；
- scroll 解构为 ambient；
- 上滚重组；
- 保留媒体与返回 SPACE；
- 移除旧可拖拽 viewer。

门槛：

- 无拖拽；
- 可逆；
- 正文可读；
- 双击空白与 Pointer Lock 返回可靠；
- route 离开资源完全释放。

### Phase 3：Profile 单组

- Hero free field；
- Hero→Education gather；
- Education→Architecture camera interpolation；
- 35% 左右渐变阅读岛；
- 文字只随正常滚动。

门槛：

- 无文字 opacity/transform tween；
- 组内不碎裂；
- 镜头线性；
- cursor parallax 与局部亮度克制；
- 没有纯视觉无字空场。

### Phase 4：Profile 三组

- 接入 Architecture、Livehouse、Culture/Lab；
- A→B→C 同粒子群 morph；
- pause/resume ArchiveHub；
- 正反滚动。

门槛：

- morph 可逆；
- 粒子 ID 稳定；
- Profile↔DevStories 无视觉/滚动跳变；
- paused 时无持续帧循环；
- 离开 ArchiveHub 正确释放。

### Phase 5：ASCII reveal

- 只在 Group C；
- cursor 圆域；
- 不移动粒子；
- 混合 ASCII 词汇；
- GPU 局部实现。

门槛：

- 圆域小且边缘柔和；
- 不遮正文；
- 不增加逐点 CPU 计算；
- 离开 Group C 后完全关闭。

### Phase 6：DevStories 与完整回归

- 保持三栏、sticky、内容；
- DotGrid cursor 改为亮度语义；
- 灰黑玻璃 + 克制橙色；
- 完整浏览器与路由回归。

---

## 17. 自动化验证建议

建议新增或扩展以下类型测试。实际文件名由实现计划决定。

### 离线粒子工具

- 同一输入 + 同一 seed 输出 hash 相同；
- 三个 Profile 输出 pointCount 相同；
- camera/target 节点缺失时报可读错误；
- degenerate triangle 不导致 NaN；
- transform 正确应用；
- source GLB 保持只读；
- 输出报告完整；
- public shipping 不包含 source high-poly。

### Timeline

- Hero→01 progress 单调；
- 组内只更新 camera，不更新 target model；
- 02→03、04→05 才更新 morph target；
- progress 反向时状态完全可逆；
- section 文本不由 timeline 写 opacity/transform；
- Profile 视觉中心与阅读岛 side 相反；
- WorkDetail Hero→Overview 正确进入 ambient。

### Lifecycle

- Profile→DevStories：Particle Host pause，不 dispose；
- DevStories→Profile：恢复相同 visual state；
- 离开 ArchiveHub：dispose 一次；
- WorkDetail 换 exhibit：旧 buffer dispose；
- renderer generation 不重复；
- DotGrid 与 Particle Host 不同时运行。

### Interaction

- cursor 不改变 particle position；
- cursor 只改变 brightness uniforms；
- ASCII 只在 Profile Group C；
- WorkDetail 不启用 ASCII；
- Canvas `pointer-events: none`；
- 双击空白返回 SPACE；
- canvas/media/link 不误触发空白返回。

### 现有合同

至少复跑：

- `apps/web/tests/app/router.contract-test.mjs`
- `apps/web/tests/app/work-route.test.mjs`
- `apps/web/tests/space/runtime-boundaries.contract-test.mjs`
- `apps/web/tests/space/persistent-host.contract-test.mjs`
- `apps/web/tests/space/canvas-pointer-lock.test.mjs`
- `apps/web/tests/space/request-space-pointer-lock.test.mjs`
- `apps/web/tests/components/dot-grid-pointer.test.mjs`
- `apps/web/tests/components/ark-glass-tile.contract-test.mjs`

最终：

```powershell
npm run verify:quick
npm run build:chunks
npm run asset:check
```

如果首个 Demo 仍为隔离开发面，先跑针对性测试与构建，不要在视觉参数尚未批准时大范围更新生产合同。

---

## 18. 浏览器目视验证建议

至少覆盖：

- 1440×900 / DPR 1；
- 1440×900 / DPR 2；
- 原生 WebGPU；
- 强制 WebGL2；
- Profile 从 Hero 缓慢滚到 06；
- 快速下滚；
- 快速反向上滚；
- 在跨组 morph 中反复改变方向；
- cursor 静止 30 秒观察微闪和人浪；
- cursor 横跨模型观察局部亮度；
- Group C 进入/离开 ASCII 圆域；
- Profile→DevStories→Profile；
- 两页分别滚到中段后互切；
- WorkDetail→SPACE；
- WorkDetail 双击空白；
- WorkDetail 图片、视频、Lightbox；
- 连续切换多个作品；
- 资源加载失败；
- WebGPU→WebGL2 fallback；
- 长时间运行后的 GPU/JS memory。

视觉验收重点：

- 点云可读，但仍明显是独立粒子；
- 约 2× 粒径不造成大面积糊成实心；
- 微动画像“人群波动”，不是沸腾噪声；
- cursor 亮度提升局部、克制；
- Profile 模型始终让位于 35% 阅读岛；
- 阅读岛渐变不变成实心卡片；
- 文字只随真实滚动；
- DevStories 不像另一个 3D Demo；
- WorkDetail 后续 ambient 不抢图片/视频/正文。

---

## 19. 仍需在施工中标定、但不影响开始 Demo 的参数

这些不是未完成的产品方向，而是应通过 Tree Habitat Demo 调出的数值：

1. 实际 pointCount；
2. Demo “2× 粒径”对应的 CSS pixel / device pixel 参数；
3. WebGPU 与 WebGL2 的 pointCount 比例；
4. twinkle 周期与亮度幅度；
5. crowd-wave 的速度、方向、波长和位移幅度；
6. cursor brightness radius；
7. cursor brightness gain；
8. Profile cursor camera parallax 最大角度；
9. WorkDetail 自动旋转速度；
10. WorkDetail Hero→Overview 解构区间；
11. Profile section progress 的采样区间；
12. ASCII 字符 atlas、密度与圆域半径；
13. binary position quantization；
14. particle cache 文件大小预算；
15. camera node 在 Blender/Rhino 中的具体摆放步骤。

### 尚未提供的内容资产

- Architecture 专用 Profile 视觉源；
- Livehouse 高模；
- Culture/Lab 高模；
- Hero 实际联系方式文案；
- WorkDetail 其他展品的独立视觉源。

首个 Tree Habitat Demo 不需要等待这些资产。

---

## 20. 已被明确否决或覆盖的方向

Kimi 不应重新提出或擅自实现：

- 三页共用同一种背景 Demo；
- Profile / WorkDetail 在新粒子层下继续运行 DotGrid；
- WorkDetail 保留可拖拽 OrbitControls；
- 鼠标吸引、排斥、拖动粒子位置；
- cursor 流体尾迹；
- cursor 涡旋；
- Profile 文字 opacity / autoAlpha 动画；
- 旧文字完全消失后才出现新文字；
- 章节硬 snap；
- 重新引入旧 pin 长镜头；
- Profile 六章六个不同模型；
- DevStories 改成 Profile 左右阅读岛；
- DevStories 加 3D/ASCII；
- 移动端运行简化粒子版；
- 预渲染视频作为主实现；
- 原模型材质/贴图进入粒子颜色；
- 要求用户为运行时主动减面；
- 修改正式 SPACE / Focus GLB 来服务粒子系统；
- 为效果重新引入复杂新 runtime 或新依赖。

---

## 21. Kimi K3 建议接手顺序

1. 读本交接文档；
2. 再次只读核对 baseline 与 status；
3. 阅读第 2 节列出的现有页面/renderer/lifecycle 文件；
4. 只为 Phase 1 写实施计划；
5. 明确 Demo 是 dev-only calibrator 还是临时接入 `/works/arch_treehabitat`；
6. 以 TDD/契约方式先锁：
   - source GLB 只读；
   - deterministic particle bake；
   - cursor brightness 不修改 position；
   - renderer fallback；
7. 使用 Tree Habitat Focus GLB 生成可重建缓存；
8. 做灰阶点云、自动旋转、约 2× 粒径、微闪、人浪、局部增亮；
9. 先让用户目视标定；
10. 用户批准视觉参数后，再进入 Phase 2 WorkDetail 集成；
11. 不要提前实现 Profile 三模型或 ASCII。

---

## 22. 最终一句话

这不是“给三页铺一层粒子特效”，而是：

> 用离线采样把用户的高模转成固定预算、可 morph 的灰阶粒子数据；在 WorkDetail 中让作品从自动旋转的点云展台解构为阅读背景，在 Profile 中让自由粒子与三件模型按真实滚动连续汇聚、换镜头和重组，而 DevStories 只通过轻量 DotGrid 与 UI 语言保持同源。

首个施工目标只有一个：**以现有 Tree Habitat Focus GLB 做出可目视标定的单模型灰阶点云 Demo。**
