# 滚动三页方形贴 · 克制工业液态玻璃

日期：2026-07-23  
状态：待用户审阅 spec  
范围：桌面滚动三页（`/profile`、`/devstories`、`/works/:id`）中的独立方框贴

## 目标

为开发日志 GUILT / TROUBLE / NEXT 等同类独立方框贴增加克制的液态玻璃质感：面内悬浮高光 + 边缘游走高光。强度为「克制工业」（直角、轻模糊），不走满配 iOS 液态。

## 已确认决策

| 项 | 选择 |
| --- | --- |
| 范围 | **B**：三页里所有独立方框贴（非正文大面板） |
| 强度 | **A**：克制工业 |
| 实现库 | **`@khvicha/react-liquid-glass`** |
| 不在范围 | 简介正文大块、作品规格区、hero、顶栏、切换条 |

## 挂载点（明确列表）

1. `apps/web/src/pages/devstories/DevStoriesContent.tsx` → `.ark-dentry__panel`（含 `--trouble` / `--next`）
2. `apps/web/src/pages/profile/ProfileContent.tsx` → `.ark-links__item`
3. `apps/web/src/pages/works/WorkDetailPage.tsx` → `.ark-wnav__link`

以上三处用同一封装包裹；不散落直接 `import` 第三方库。

## 架构

```
ArkGlassTile（仓库封装）
  └── LiquidGlass（@khvicha/react-liquid-glass）
        └── 原贴内容（label / ul / Link 文案等）
```

- 新增 `apps/web/src/components/ArkGlassTile.tsx`
- 依赖安装到 `apps/web`（与现有 React 应用同级）
- CSS：调整 `scroll-pages.css` 中对应选择器，去掉与玻璃层重复的实心底/双边框，保留排版与栅格

## 组件合同：`ArkGlassTile`

### Props

| Prop | 类型 | 说明 |
| --- | --- | --- |
| `children` | `ReactNode` | 贴内内容 |
| `className` | `string?` | 透传到外层，承接现有 `ark-dentry__panel` 等类名 |
| `variant` | `"panel" \| "link" \| "nav"` | 仅微调 tint / 边线语义色；默认 `panel` |
| 其余 | 不透出 blur/radius 等库参数 | 防止各调用点漂移 |

### 内部写死（克制工业预设）

- `blur` ≈ 8
- `borderRadius`：`0` 或 `2px`（直角优先）
- `enableBorderAnimation`：`true`（边缘游走高光）
- `enableClickAnimation`：`false`（贴不是 CTA 按钮）
- `parallaxMovement`：`0`（禁止贴片位移）
- `displacementScale`：低值，文字不扭曲
- `tint` / `borderColor`：基于 `--ark-*` 中性色；`variant` 可轻微偏 accent，但不引入新色族

### 交互与可访问性

- `link` / `nav`：外层或内层保持原有 `<a>` / Router `Link` 语义；玻璃层不吞掉点击与键盘焦点
- `prefers-reduced-motion: reduce`：关闭边光与任何位移类动画，仅保留静态玻璃底（模糊 + 半透明）
- 触摸设备：无可靠 hover 时允许仅静态玻璃（边光可不启用）

## 样式合同

- 中性色继续占主导；高饱和仅保留既有 label（如 TROUBLE 橙）
- 禁止紫粉霓虹、大圆角、多层发光阴影堆叠
- 三列栅格（`.ark-dentry__grid`）几何与现网一致：玻璃不得撑破列宽或改变 gap
- 标签色类（`--trouble` / `--next`）仍通过 `className` 保留

## 非目标

- 不改装 SPACE 3D HUD、Lobby、Mobile Terminal
- 不替换 Magnet / DotGrid 等已有动效
- 不因玻璃重写内容数据管线

## 验收清单

- [ ] 开发日志三格：悬浮有面内高光 + 边缘高光；静止时仍有可读玻璃底
- [ ] 简介链接格、作品上下篇导航格同效
- [ ] 文字清晰、无持续抖动、无点击波纹干扰阅读
- [ ] 布局与改前栅格对齐（目视 + 窄屏 900px 断点不破版）
- [ ] 系统 `prefers-reduced-motion: reduce` 时无边光游走
- [ ] `npm run verify:quick` 通过

## 风险与缓解

| 风险 | 缓解 |
| --- | --- |
| 库默认圆角/强折射偏离舟味 | 封装层写死预设，调用方不可覆写强度 |
| `backdrop-filter` 在多层 `transform`（Reveal/scrub）下掉效 | 测 sticky/Reveal 后的面板；必要时降低父级 filter 或简化玻璃层 |
| 多实例 SVG filter 性能 | 仅挂独立方贴；`displacementScale` 压低；滚动时不额外 rAF |
| 包维护度低 | 封装隔离；若 API 不合可换薄 CSS 实现而不改调用点 |

## 实现顺序（供后续 plan 使用）

1. 安装 `@khvicha/react-liquid-glass` 到 `apps/web`
2. 实现 `ArkGlassTile` + 预设
3. 接到三处挂载点并改 CSS 去双层底
4. reduced-motion 与点击穿透检查
5. `verify:quick` + 目视三页
