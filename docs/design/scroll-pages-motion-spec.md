# 滚动流三页动效规范（scroll-pages motion spec）

> 适用范围：`/profile`、`/devstories`、`/works/:exhibitId`（`apps/web/src/scroll/` + `src/pages/{profile,devstories,works}/`）。
> 风格约束：舟味「克制动效」——电影感但不喧宾夺主；结构表达优先，装饰只服务识别与状态。
> 设计依据：`docs/design/arknights-industrial-flat-design-research.md` §3.6 / §7。

## 1. 技术栈与接入方式

- **GSAP 3.15 + ScrollTrigger**：所有滚动驱动动画。插件在 `src/scroll/useLenisScroll.ts` 与使用方文件中 `gsap.registerPlugin(ScrollTrigger)`。
- **Lenis**：页面级平滑滚动，挂在壳层滚动容器 `.ark-scroll`（不是 window/body——应用是全Viewport无body滚动，见 `global.css`）。
- 联动模式（官方标准接法）：
  ```ts
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000)); // gsap ticker 秒 → lenis 毫秒
  gsap.ticker.lagSmoothing(0);
  ```
- **scroller 必传**：页面滚动发生在 `.ark-scroll` 容器内，每个 ScrollTrigger 配置必须带 `scroller`（由 `ScrollPageContext` 提供）。漏传会退化到 window，动画永不触发。
- React 集成：`useLayoutEffect` + `gsap.context(() => …, el)`，cleanup 一律 `ctx.revert()`。

## 2. 动效清单与参数

| 动效 | 参数 | 用途 |
| --- | --- | --- |
| Reveal（fade + 上移） | `autoAlpha 0→1, y 28→0, duration 0.9, ease power3.out, once: true, start "top 88%"` | 分节标题、段落、面板进场 |
| Stat 数字滚动 | `duration 1.4, ease power2.out, snap 1, once: true, start "top 90%"` | 大数字数据带 |
| Sticky 章节轨 | 纯 CSS `position: sticky`（无 JS） | profile/devstories 编号轨、章节索引 |
| Scrollspy | `IntersectionObserver, rootMargin "-30% 0px -60%"` | 顶栏锚点高亮 |
| 锚点跳转 | `lenis.scrollTo(el, { offset: -72, duration: 1.2 })` | 顶栏锚点点击 |
| Hero 滚动提示 | CSS `scaleY` 呼吸 2.2s | hero 右下 SCROLL 竖条 |
| 3D 展台自转 | `OrbitControls autoRotate, speed 0.8, damping 0.12`，用户首次拖拽后永久停转 | works 主媒体区 |

## 3. 不做的事（负面清单）

- 不做 parallax 多层位移（舟味靠结构不靠炫技）。
- 不做 pin 长镜头/scrub 叙事（当前信息量不需要；参考站 hero 级别即可）。
- 不做无限循环的装饰性微动画（scroll hint 除外）。
- 不动 layout 属性（width/height/top/left）——一律 transform + autoAlpha。
- 不给每个列表项做 stagger——长列表（profile details、devlog built/trouble）静态呈现，克制优先。

## 4. 降级（prefers-reduced-motion）

- `useLenisScroll`：不初始化 Lenis，退回原生滚动。
- `Reveal` / `Stat`：跳过 GSAP，内容直接静态呈现（Stat 直接写入终值）。
- CSS 侧：scroll hint 呼吸动画、hover transition 全部 `animation: none / transition: none`（见 `scroll-pages.css` 末尾媒体查询）。
- 3D 展台 autoRotate 不额外处理（OrbitControls 静态可拖，属功能性非装饰性）。

## 5. 维护要点

- 新增滚动动画：只在 `Reveal`/`Stat` 模式内扩展，新增组件必须走 `ScrollPageContext` 拿 `scroller`。
- GSAP 回调里写 DOM（如 Stat 的 textContent）只写 ref 拥有的节点，cleanup 由 `ctx.revert()` 兜底。
- 页面卸载时 Lenis `destroy()` + ticker `remove()`（`useLenisScroll` 已封装），不要手动 `window.removeEventListener` 漏配。
