# Canvas UI：SPACE 的按需效果源

核对日期：2026-09-05。来源是 [canvasui.dev](https://canvasui.dev/)
和 [DavidHDev/canvas-ui](https://github.com/DavidHDev/canvas-ui)。
不要与同名的 `canvasui/CanvasUI` 混淆。

## 本次接入做了什么

- 在 `apps/web/components.json` 固定 `@canvas-ui` registry 地址。
- 为 shadcn 的源码落盘配置 `@/* -> src/*`，同时覆盖 TypeScript 和 Vite。
- 在根 package.json 提供搜索、源码查看、安装预览和按需安装命令。
- 根 `AGENTS.md` 指向本文，供 Codex、Cursor 等后续 agent 查阅。

**尚未安装任何 Canvas UI 效果、未挂载到任何页面。** 没有引入新的运行时依赖、
Tailwind、shadcn 样式主题或 MCP 服务，也没有改动现有 SPACE 视觉。
`components.json` 中的 style/tailwind 字段用于 CLI 配置兼容；不是迁移样式系统的授权。
不要运行 `shadcn init` 来覆盖项目的全局 CSS。

Canvas UI 使用源码复制模式，后续只把选中的组件和必要依赖纳入版本控制；
不需要克隆、打包或部署它的 Next.js 文档站。详见[介绍](https://canvasui.dev/docs)
与[安装文档](https://canvasui.dev/docs/installation)。

## 后续可以怎样提出需求

- “用 Canvas UI 的 ASCII Object，把某个模型放在个人页面背景。”
- “在作品详情页试 Particle Object，滚动时逐步解构，正文仍然可读。”
- “搜索 Canvas UI 里适合开发日志的字符效果，先给我比较再实现。”
- “给这个区域加 Liquid；先检查不支持 HTML-in-Canvas 时的表现。”

不必事先记住组件名；说明页面、素材和想要的运动，agent 先检索和讨论取舍。
“收录为效果源”不等于默认批准将特效应用到整个网站。

## 与三页面探索最相关的效果

以下是选型入口，不是已通过 SPACE 验收的组件列表。

| 方向 | 官方效果页 | 在 SPACE 中的候选用途 |
| --- | --- | --- |
| 模型字符化 | [ASCII Object](https://canvasui.dev/docs/components/ascii-object) | 模型驱动的字符背景 |
| 模型粒子化 | [Particle Object](https://canvasui.dev/docs/components/particle-object) | 点云形体、交互散开与复原 |
| 模型二值化 | [Dithered Object](https://canvasui.dev/docs/components/dithered-object) | 克制的网点模型视觉 |
| 模型材质表达 | [Glass Object](https://canvasui.dev/docs/components/glass-object)、[Ink Object](https://canvasui.dev/docs/components/ink-object)、[Liquid Object](https://canvasui.dev/docs/components/liquid-object) | 分别评估玻璃、印刷与流体表达 |
| HTML 滚动粒子化 | [Particle Scroll](https://canvasui.dev/docs/components/particle-scroll) | 页面内容的滚动边界效果 |
| HTML 字符表达 | [Asciify](https://canvasui.dev/docs/components/asciify)、[Decrypt Reveal](https://canvasui.dev/docs/components/decrypt-reveal)、[ASCII Sweep](https://canvasui.dev/docs/components/ascii-sweep) | 局部文字或内容转场实验 |

**Particle Scroll 不等于“3D 模型随滚动变粒子”。** 模型与页面滚动进度的连接，
仍需在 SPACE 现有 GSAP/Lenis 生命周期中设计适配，不假定上游提供任意 scroll-progress API。

其他效果可在[完整目录](https://canvasui.dev/components)检索：Blaze、Bubble、Bend、
Canvas、Cloth、Clouds、Displacement、Droplets、Flame Wrap、Force Field、Frost、
Glass、Glitch、Glyph Rain、Grid、Hex Float、Laser、Liquid、Magnify、Particle Reveal、
Peel、Retro Dither、Ripple、Shatter、VHS。以实时 registry 为准，不依赖固定组件数量。

## 命令入口

在仓库根目录执行（Node/npm 按 package.json engines）：

```bash
# 在线搜索；不安装组件
npm run canvasui:search -- --query particle --limit 12

# 查看 registry 元数据和源码；不安装组件
npm run canvasui:view -- @canvas-ui/particle-object-react

# 预览将写入的文件、CSS 和依赖；不写入组件
npm run canvasui:preview -- @canvas-ui/particle-object-react

# 仅在确认具体需求并完成预览之后使用
npm run canvasui:add -- @canvas-ui/particle-object-react
```

这些脚本使用 npm 的 package runner 按需运行 shadcn CLI；需要网络，首次运行会写入
npm 的工具缓存，但不会把 shadcn 本身加进本项目依赖。
`@latest` 跟随上游工具更新，安装前必须重新 preview；源码实际引入后由本项目 Git 固定版本。

React WebGL 项目名为 `@canvas-ui/<effect>-react`；WebGPU 版加 `-webgpu`，例如
`@canvas-ui/particle-object-react-webgpu`。不要同时安装两版到相同目标文件。
选型和命名依据[渲染文档](https://canvasui.dev/docs/rendering)。

目标目录为 `apps/web/src/components/canvasui/`。已在本项目对
`@canvas-ui/ascii-object-react` 完成 dry-run：目标为该目录下 `AsciiObject.tsx`，
registry 声明 `three` 和 `@types/three`；尚未执行 add。
`Particle Object` 的查询和 dry-run 也已通过，目标为 `ParticleObject.tsx`，声明相同依赖。
源码内若有自定义别名或其他依赖，逐项复核，不以 dry-run 代替源码审查。

核对时 CLI 为 shadcn 4.21.0、Node 24.11.0、npm 11.6.1。一次搜索在输出结果后
以 Windows `UV_HANDLE_CLOSING` 断言退出，相同只读命令复跑 exit 0；根因尚未定位。
遇到这类工具异常必须检查退出码，不能把已打印结果当成功。搜索/view/preview 可在确认未写入后
复查；实际 add 若异常，先检查文件与 lockfile，不能盲目重试或开启 overwrite。

## 浏览器与运行时边界

- WebGL2 版优先作为装饰效果的兼容性候选；这不改变 SPACE 本身 WebGPU 优先的策略。
  WebGPU 版另有 vgpu / WebGPU types 需求，先检查实际 registry 依赖。
- HTML-in-Canvas 与 WebGPU 是不同的能力检查。支持 WebGPU 不代表支持 HTML 捕获。
  对依赖 HTML-in-Canvas 的效果，无该能力时必须保留正常 HTML，不能承诺与官网相同。
- 官网使用自己的 origin-trial token。它不会随组件复制后授权 SPACE 的域名；
  不复制该 token，也不要求访客开启浏览器实验 flag。需要生产 trial 时单独讨论。
- 原始 3D Object 效果与 HTML 捕获类效果要分开验证。模型格式、Draco/KTX2 等解码器、
  外部纹理和环境贴图 URL 都要检查；网页能展示一个简单 GLB，不代表能直接加载所有正式模型。
- 使用已有授权衍生素材；不得直接修改正式 `space_main.glb`、Blender 或 Rhino 源资产。
  使用项目 public-asset 路径工具，兼容 GitHub Pages `/lizzardkevin-space/` 基址。
- 不额外创建第二套 Lenis/ScrollTrigger 全局滚动所有者；背景层不得抢正文、链接、选字、
  页面滚动或 SPACE 返回的 Pointer Lock 手势。装饰层默认不承担必要内容。
- 按路由 lazy-load；检查 StrictMode 重挂、迟到异步加载、RAF、observer、listeners、
  texture/material/geometry/render-target 与 renderer 的销毁。新效果不自动共享 SPACE factory。
- 检查屏幕外/后台暂停、DPR 与粒子预算、移动端和 reduced-motion/static fallback。
  与 persistent SPACE 同时持有 GPU 资源的成本必须实测。
- 不顺带升级 Three、降低 4096 shadow、给展品加墨边，或安装上游站点的 Next/Tailwind 等依赖。

上述兼容性说明来自[安装](https://canvasui.dev/docs/installation)和
[渲染](https://canvasui.dev/docs/rendering)文档；具体上游实现仍须逐项审查与实测。

## 许可证与来源记录

上游为 [MIT + Commons Clause](https://github.com/DavidHDev/canvas-ui/blob/main/LICENSE.md)，
不是无附加限制的 MIT。许可证允许把代码用于个人/商业应用或网站，但限制单独、打包或移植后
出售、转授权或重新分发组件本身；复制实质源码时保留上游版权及许可声明。

后续引入源码时，在对应目录保留许可文件，并记录 registry item、渲染版本、获取日期、
上游 commit（能够核实时）、源文件校验值和本地适配点。不要把本项目做成组件再分发镜像。
本次没有复制组件源码，只有配置、命令和链接索引。

## 后续安装验收

1. 先确认页面、素材、效果范围和渲染版，再 view + preview。
2. 检查安装前后 git diff；保持其他 WIP 和 source assets 不动。
3. 阅读新增源码与依赖变化，再进行路由级接线；不能仅靠安装命令宣告接入完成。
4. fresh `npm run verify:quick`、`npm run build:chunks`、
   `npm run build:github-pages:chunks`、`git diff --check`。
5. 真实浏览器检验效果与降级、文本可读性、移动端、reduced motion、路由往返、Pointer Lock、
   console 和资源释放；报告证据及仍未覆盖的设备边界。

## MCP

Canvas UI 通过通用 shadcn MCP 暴露 registry，见[官方说明](https://canvasui.dev/docs/mcp)。
当前项目已提供可用 CLI 入口，不依赖 MCP。此次没有修改 Codex/Cursor 的全局 MCP 配置，
也不代表当前会话已拥有 shadcn MCP 工具；需要时另行配置并重启/确认客户端连接。
