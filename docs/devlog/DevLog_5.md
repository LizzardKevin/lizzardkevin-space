# DevLog_5（桌面前端基准 · space_main · 手机端 Terminal Site）

时间：2026-06-09 ~ 2026-06-16（DevLog_4 之后的桌面体验、主空间资产与手机端页面开发）

## 本次目标

这轮有两条线一起往前走。桌面端继续整理第一屏、Pointer Lock、Overlay、DevStories 和滚轮目录，先做出一版稳定的前端基准；生产主场景从 `gallery_main` 换到 `space_main`，旧场景只留作历史 demo / 测试资产。

手机端单独做轻量页面，不加载 WebGPU SPACE、Pointer Lock、桌面 Overlay 或 DevStories。内容先按 terminal / markdown 的形式放入 Projects、Skills.md、Soul.md、Contact.md，并支持中英文。关键交互会写进脚本级 contract test，后面不用只靠手测去回忆状态。

## 已完成产出

### 1) 桌面入口和第一人称恢复

- 入口白屏只留下：
  - `LizzardKevin Space`
  - 点击进入提示
  - 整组文字可点击，可键盘进入。
- 桌面端会等 SPACE canvas ready 后再进入，免得点击后先看到没准备好的 3D 背景。
- 点击入口时在同一用户手势里请求 pointer lock，减少浏览器安全限制导致的失败。
- Overlay 关闭时继续同步 cursor return 与 pointer lock 恢复：
  - 普通关闭走 cursor return。
  - ESC 关闭走 escape 恢复路径。
- 自定义 cursor 的桌面状态继续细化：
  - 深浅模式跟随 Overlay 分区。
  - 关闭 Overlay 后回到 SPACE 控制。
  - 滚轮切换时保留 cursor 反馈。

### 2) Frosted Split Overlay 和 DevStories

- Profile / DevStories 从长页面改成全屏 Frosted Split：
  - 左侧白色 Profile。
  - 右侧黑色 DevStories。
  - 中间滑动分界线。
  - 半透明毛玻璃和低密度 index。
- DevStories 侧接入 `apps/web/src/content/devStories.ts`，并让最新日志出现在桌面端 DevStories 列表中。
- 中间 stage 的滚轮目录改成状态机：
  - 慢速跟手。
  - 过阈值时上一条飞出、下一条飞入。
  - 首尾回弹。
  - 一次 wheel gesture 只允许跳一条，防止触控板惯性连续跳页。
- Detail 控件从容易误读的两位数字换成 `+ / -`，对应展开和收起。
- 追加 `scripts/frosted-split-wheel-paging-test.mjs` 和 `scripts/frosted-overlay-contract-test.mjs` 锁定这些交互约束。

### 3) 生产主场景换到 `space_main`

- 新增并接入生产主空间：
  - `BlenderFile/space_main.blend`
  - `apps/web/public/models/space_main.glb`
- `galleryConfig.ts` 改为加载：
  - `/models/space_main.glb?v=20260614-space-main`
- 资产文档记录了 `space_main` 的运行时约定：
  - `COL_floor_*`
  - `COL_wall_*`
  - `COL_stair_*`
  - `bulb_*`
  - `spawn_player_main`
- `gallery_main.blend` / `gallery_main.glb` 明确降级为历史 demo / 测试对照，不再作为生产展厅空间入口。
- 导出的 `space_main.glb` 继续保留 Blender / glTF 材质，不默认用运行时统一材质覆盖。
- 展品资产表同步到 `space_main` 语义：
  - 当前 `space_main` 暂未放置 `exhibit_*` hit mesh。
  - `demo_box` / `demo_bass` 的 Focus 特写仍保留在 `public/exhibits/<id>/focus_<id>.glb`。

### 4) 手机端独立入口和加载

- `SpacePage` 按平台分支：
  - desktop：加载 WebGPU SPACE、TopBar、Overlay。
  - mobile：只加载 `MobileExperience`。
- `App.tsx` 将桌面 chrome 拆到 `desktop/DesktopChrome.tsx` 并 lazy load，手机端不会静态引入桌面 TopBar / Overlay。
- `useClientPlatform` 首次 mount 时固定平台，避免横竖屏、外接鼠标或触控板导致桌面/手机分支来回切换。
- 手机端删掉旧的 “Preparing mobile SPACE” 占位，进入后直接跑 terminal boot：
  - `$ space-cli boot --mode mobile`
  - `loading terminal session...`
- boot 不再是固定 3 秒假加载：
  - 最短 3000ms。
  - 最长 10000ms。
  - 等待配置的 web font 载入。
  - 字体加载最多重试 3 次，失败则进入 fallback。

### 5) 手机端 Terminal Site 页面

- 新增主文件：
  - `apps/web/src/pages/MobileExperience.tsx`
  - `apps/web/src/mobile/mobileArchiveData.ts`
- 手机端不是桌面 DevStories 的移动版，而是一套独立终端文档：
  - `Projects`
  - `Skills.md`
  - `Soul.md`
  - `Contact.md`
- 初始状态不默认打开任何 tab，保留一个 idle document 区域；用户第一次点 tab 后才加载文档内容。
- `Projects`：
  - 当前保留 12 个 project slot。
  - 按 Education、Professional Practice、Personal Archive、Explore 分组。
  - 每个项目有独立 detail view。
  - detail 包含 Current Signal、SPACE Layer、Archive Note 和 media placeholder。
- `Skills.md`：
  - 使用 markdown-style fold section。
  - 分类包括 AI、Visual / Spatial / Creative、Digital、Analog、Soft。
  - 每个技能有中英文摘要，不再复用旧的 placeholder expertise chip。
- `Soul.md`：
  - 使用手机端本地化 copy。
  - 包含 Education、Professional Practice、Persona、Rule 四组内容。
- `Contact.md`：
  - 使用手机端本地化联系信息。
  - 包含姓名、身份行、电话、邮箱、地点、GitHub 和 practice formula。
- 所有主要正文支持 `en` / `zh`，terminal command 仍保持英文 shell 语法，避免出现伪中文命令。

### 6) 手机端设置、主题和字体

- 手机端设置面板包含：
  - 语言：`EN` / `中文`
  - 主题：`Light` / `Dark`
- 偏好写入 localStorage：
  - `mobileTerminalLanguage`
  - `mobileTerminalThemeV2`
- 默认语言为英文，默认主题为浅色。
- 主题切换做了过渡：
  - 记录点击按钮中心点。
  - 用 `clip-path: circle(...)` 做圆形 reveal。
  - 通过 `mix-blend-mode: difference` 做黑白反相式过渡。
  - 动画开始后再真正切换 theme state。
- 英文字体使用本地自托管 Ubuntu Mono：
  - `apps/web/public/fonts/ubuntu-mono/UbuntuMono-Regular.woff2`
  - `apps/web/public/fonts/ubuntu-mono/UbuntuMono-Bold.woff2`
- 中文模式不下载额外中文 web font，使用系统中文字体栈，避免移动端字体包膨胀。

### 7) 手机端滚动折叠和动效

- 手机端 header 不再靠旧的 boolean compact class，而是根据滚动进度写入 CSS variables：
  - `--terminal-collapse`
  - `--terminal-content-scroll-y`
  - `--terminal-nav-scroll-y`
- `Space` 标题在 36px 滚动距离内折叠到小标题旁边。
- 文档内容和四个主 tab 会按滚动量进行补偿，避免 header 折叠时内容被视觉钉住或错位。
- 修复项目详情、普通文档和 Contact.md 的可滚动空间，让任何页面都能完成 header 折叠。
- tab 切换、项目打开、项目返回不再强制把 header 打开，而是根据当前折叠进度 snap 到最近状态。
- 文本重新加载动画放在内部 `mobile-terminal-loadLayer` 上，不放在滚动补偿元素上，避免动画影响几何。
- fold section 使用 controlled `details / summary`：
  - 阻止原生 summary 直接跳状态。
  - 用 grid row 做快速展开/收起动画。
  - closed body 保持挂载，保留收起动画。

### 8) 验证脚本与构建约束

- 新增或补强的脚本：
  - `scripts/mobile-site-contract-test.mjs`
  - `scripts/frosted-overlay-contract-test.mjs`
  - `scripts/frosted-split-wheel-paging-test.mjs`
  - `scripts/space-interaction-contract-test.mjs`
  - `scripts/build-chunk-contract-test.mjs`
- `npm run build:chunks` 会先 build，再检查 chunk 约束，防止首屏重新吞入桌面重依赖。
- `npm run package:test` 用于打包产物级检查。
- 手机端 contract test 覆盖：
  - 手机端不导入 DevStories。
  - 桌面 chrome lazy load。
  - terminal 四个 tab 顺序。
  - boot 文案、时长与字体加载。
  - 中英文 copy。
  - theme reveal。
  - scroll collapse CSS variables。
  - fold section、project detail、Skills.md、Soul.md、Contact.md。

## 遇到的问题与处理

| 问题 | 处理 |
|------|------|
| 手机端如果直接复用桌面 SPACE，会把 WebGPU、Pointer Lock、Overlay、DevStories 全部带上 | 平台分支改为手机只加载 `MobileExperience`，桌面 3D 与 desktop chrome lazy load |
| Pointer Lock 必须发生在用户手势中，否则入口会看似点击成功但第一人称没接上 | 桌面入口点击同一手势内请求 pointer lock；失败时只保留 fallback，不重复抛 unhandled error |
| 触控板 wheel 惯性会让 DevStories stage 连跳两条 | wheel paging 改为 gesture lock，等待 wheel idle 后才允许下一次选择 |
| Frosted Split 初版存在 content-box + padding 导致说明文字被裁切 | 面板布局改为 `border-box` 约束，并用 contract test 锁定 |
| `gallery_main` 和 `space_main` 名义混用，容易让后续 Blender / WebGPU 流程继续操作 demo | 文档、运行时 URL、资产表和命名规范统一声明 `space_main` 是生产主空间 |
| 手机端旧方案仍像桌面信息页的缩小版，阅读负担大 | 改成 terminal / markdown 文档结构，四个 tab 只保留手机上可快速扫描的信息 |
| boot 固定时长无法处理字体加载失败或慢网 | 使用最短 / 最长时长 race，并接入 `document.fonts.load` 与重试 |
| 中文字体如果也自托管会增加移动端包体 | 中文模式改用系统字体栈，只有英文 Ubuntu Mono 自托管 |
| 旧 theme localStorage key 会污染新手机端默认主题 | 新增 `mobileTerminalThemeV2`，不读取旧 key |
| 手机端 header 折叠初版会让正文像被 pin 住，滚动几何不自然 | 拆出 `applyTerminalScrollState`，分别计算 collapse、content offset 和 nav offset |
| 文本 load animation 放在滚动补偿容器上会造成布局抖动 | 动画下沉到内部 `mobile-terminal-loadLayer` |
| tab 切换 / 项目切换如果强制 scrollTop=0，会打断用户当前折叠状态 | 改为 snap 到当前折叠进度最近端点 |
| Contact.md 页面内容较短时无法触发完整 header collapse | 所有 terminal document / project detail 都预留额外 scroll room |
| in-app browser / 自动化环境无法完整代表真实 WebGPU + Pointer Lock | 用静态 contract、构建、包检查覆盖可自动化部分；真实 Chrome / 真机仍作为上线前手测项 |

## 当前验证状态

相关功能变更在补写文档前已经随最近提交进入 `main`。文档补完后，重新执行了：

```text
node scripts/mobile-site-contract-test.mjs
node scripts/frosted-split-wheel-paging-test.mjs
node scripts/frosted-overlay-contract-test.mjs
node scripts/space-interaction-contract-test.mjs
npm run build:chunks
npm run package:test
```

- 手机端 terminal contract：通过，覆盖移动端结构、copy、主题、字体、滚动折叠和文档动效。
- Frosted Split contract：通过，覆盖桌面 Overlay 与滚轮目录。
- Space interaction contract：通过，覆盖入口、pointer lock、cursor 与 `space_main` 相关交互约定。
- Build chunk contract：通过，确认桌面重依赖仍被分包，不重新压回入口。
- Package test：通过，生成 `release/LizzardKevin-Space-test.zip`。
- 还要手测真实手机 Safari / Chrome 的滚动手感、safe-area、字体 fallback、主题 reveal，以及真实桌面 Chrome 的 WebGPU / Pointer Lock / `space_main` 渲染。

## 下一步计划

1. 在 iPhone Safari、Android Chrome 上检查 boot、滚动折叠、主题 reveal、Contact 链接、横竖屏和系统字体。
2. 把 12 个 project placeholder 逐步替换为真实作品、图片、视频、音频和更明确的 SPACE 房间映射。
3. 继续做桌面 Focus 的三按钮 hover、状态、billboard 和展品媒体资源接入。
4. 在 Blender 内给 `space_main` 添加正式 `exhibit_*` hit mesh，让桌面 Focus 不再只依赖 demo 资产。
5. 检查 `/models/space_main.glb`、`/fonts/ubuntu-mono/`、`/draco/`、`/exhibits/`、`/audio/` 是否在部署环境完整上传。

## 相关文件索引

- 手机端页面：`apps/web/src/pages/MobileExperience.tsx`
- 手机端内容：`apps/web/src/mobile/mobileArchiveData.ts`
- 手机端样式：`apps/web/src/styles/global.css`
- 平台分流：`apps/web/src/pages/SpacePage.tsx`，`apps/web/src/platform/clientPlatform.ts`，`apps/web/src/platform/useClientPlatform.ts`
- 桌面 chrome lazy load：`apps/web/src/App.tsx`，`apps/web/src/desktop/DesktopChrome.tsx`
- 桌面 DevStories：`apps/web/src/content/devStories.ts`
- Frosted Split：`apps/web/src/components/frostedSplit/FrostedSplitTabs.tsx`，`apps/web/src/components/frostedSplit/wheelPaging.ts`
- 主空间资产：`BlenderFile/space_main.blend`，`apps/web/public/models/space_main.glb`
- 主空间配置：`apps/web/src/scenes/gallery/galleryConfig.ts`
- 资产文档：`docs/asset-manifest.md`，`docs/gallery-mesh-naming.md`
- 验证脚本：`scripts/mobile-site-contract-test.mjs`，`scripts/frosted-overlay-contract-test.mjs`，`scripts/frosted-split-wheel-paging-test.mjs`，`scripts/space-interaction-contract-test.mjs`，`scripts/build-chunk-contract-test.mjs`
