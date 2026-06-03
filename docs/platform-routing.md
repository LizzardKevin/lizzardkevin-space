# 桌面 / 移动端入口分流

## 检测规则

在 `apps/web/src/platform/clientPlatform.ts` 中：

- `(pointer: coarse)` 且 **非** `(pointer: fine)` → `mobile`（手机等以触控为主）
- 其余 → `desktop`（含 iPad 横屏 + 鼠标/触控板）

`useClientPlatform` 在首次 mount 时检测一次并写入 `useRef`，避免横竖屏或外接输入导致分支来回切换。

## 配置预留

`apps/web/src/platform/platformConfig.ts`：

| 字段 | 用途 |
|------|------|
| `enableTabletSpace` | 将来平板横屏 + fine pointer 是否单独走 SPACE |
| `tabletMinWidth` | 平板最小宽度阈值 |
| `enableVirtualJoystick` | 桌面 SPACE 内虚拟摇杆（挂 `PlayerController` 侧，与移动施工中页无关） |

## 文件对照

| 职责 | 文件 |
|------|------|
| 平台检测 | `platform/clientPlatform.ts` |
| 会话固定 hook | `platform/useClientPlatform.ts` |
| 白屏入口 | `components/entry/EntrySplash.tsx` |
| 淡出状态 | `hooks/useEntryTransition.ts` |
| 路由编排 | `pages/SpacePage.tsx` |
| 桌面 WebGPU SPACE | `pages/SpaceDesktopExperience.tsx` |
| 移动施工中 | `pages/MobileExperience.tsx` |
| 壳层 TopBar/Overlay | `App.tsx`（仅 desktop） |

## 新增第三种体验（如 `tablet`）

1. 扩展 `ClientPlatform` 类型与 `detectClientPlatform` 逻辑。
2. 在 `platformConfig` 打开对应开关。
3. 新增 `TabletExperience.tsx`，在 `SpacePage` 中按平台挂载。
4. 若需独立 URL，可加路由 `/tablet`，根路径仍用同一检测逻辑。

## 验证

- 桌面浏览器：完整 SPACE + TopBar + Overlay。
- Chrome DevTools 设备模拟（粗指针、无 fine）：白屏 → 深灰施工中，无 Canvas。
- 真机部署后复测 Cloudflare Pages。
