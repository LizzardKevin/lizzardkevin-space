# DevLog_4（Cursor → Codex 接管 · 质量修复 · 入口彩蛋 · 跳跃彩蛋）

时间：2026-06-07 ~ 2026-06-08（Codex App Projects 接管后多轮会话）

## 本次目标

- 将原先 projectless chat / Cursor 延续的上下文迁移到 Codex App Projects，在本地仓库 `LizzardKevin Space` 中继续开发。
- 修复 P1 级 lint 阻断，恢复 `npm run lint`、TypeScript、生产构建的可验证状态。
- 解决生产包主入口过大、旧 `dist` 资源误导、Draco decoder 外网依赖等运行问题。
- 继续打磨入口白屏、展品 Focus、第一人称控制器，并加入一组隐藏彩蛋。
- 同步展品资产 Excel，使其与最新 CSV 和 manifest 中的 `demo_box` / `demo_bass` 一致。

## 已完成产出

### 1) Codex 接管与基线恢复

- 当前项目固定在：
  - `/Users/lizzardkevin/Documents/LizzardKevin Space`
  - GitHub 仓库：`LizzardKevin/lizzardkevin-space`
- 保留用户已有未提交改动：
  - `BlenderFile/gallery_main.blend1`
  - 未还原、未覆盖。
- 基线验证：
  - `npm run lint`
  - `npm exec -w apps/web tsc -- --noEmit -p tsconfig.app.json`
  - `npm run build`
- 旧 `apps/web/dist` 中残留的大 GLB 已通过重新 build 覆盖；`find apps/web/dist -type f -size +20M -print` 无输出。

### 2) React hooks lint 修复

- 处理 React hooks 新规则带来的 P1 lint failure：
  - render 阶段写 ref：`FocusCanvasInput.tsx`、`focusDoubleClick.ts`、`PlayerController.tsx`、`ExhibitRaycast.tsx`
  - render 阶段读 ref：`PlaybackBar.tsx`、`FocusOverlay.tsx`
  - effect 内同步 setState：`ExhibitTargetLabel.tsx`、`PlaybackBar.tsx`、`FocusOverlay.tsx`
  - R3F / Three imperative mutation：仅保留必要且局部的 eslint 注释。
- `GallerySpawnContext.tsx` 拆分：
  - `GallerySpawnContext.ts`
  - `GallerySpawnProvider.tsx`
  - `useGallerySpawn.ts`
- `PlaybackBar` 改为显式 retained state，避免 render-time ref 缓存，同时保留淡入淡出动画。

### 3) 分包与构建产物

- `SpacePage.tsx`：
  - `SpaceDesktopExperience` 改为 `React.lazy` 动态加载。
- `SpaceDesktopExperience.tsx`：
  - `FocusOverlay` 改为 `React.lazy` 动态加载。
- `vite.config.ts`：
  - 增加 Vite 8 / Rolldown `codeSplitting.groups`
  - 拆出 `react-vendor`、`three-vendor`、`rapier-vendor`
- 构建结果：
  - 主入口 chunk 从原先约 4.2 MB 降到约 148 KB。
  - `SpaceDesktopExperience` 保持在约 28 KB。
  - `FocusOverlay` 保持在约 10 KB。
  - 仍有 vendor warning，主要来自 Rapier 和 Three 第三方依赖，属于已知体积。

### 4) Draco decoder 本地化

- 发现问题：
  - `gallery_main.glb` 是 Draco 压缩的。
  - `@react-three/drei/useGLTF` 默认从 `https://www.gstatic.com/draco/...` 拉 decoder。
  - 本地预览时 decoder fetch 失败，导致主模型加载异常，表现为出生点异常和 WASD 无效。
- 修复：
  - 新增本地 decoder：
    - `apps/web/public/draco/draco_decoder.js`
    - `apps/web/public/draco/draco_decoder.wasm`
    - `apps/web/public/draco/draco_wasm_wrapper.js`
  - `galleryConfig.ts` 新增 `GLTF_DRACO_DECODER_PATH = "/draco/"`
  - `GalleryModel.tsx` 和 `FocusOverlay.tsx` 的 `useGLTF` / `preload` 均改为使用本地 `/draco/`。

### 5) Focus 展品旋转中心修复

- 问题：
  - `demo_box` Focus 页面自转中心不对。
  - GLB 中存在普通空节点 `pivot`，旧逻辑会把任何含 `pivot` 的节点当作旋转中心。
- 修复：
  - `focusModelFrame.ts` 只识别专用 pivot：
    - `focus_pivot`
    - `turntable_pivot`
    - `*_focus_pivot`
    - `*_turntable_pivot`
  - 普通 `pivot` 不再自动接管 Focus 自转中心。
  - 无专用 pivot 时使用视觉包围盒中心。

### 6) 入口白屏提示与彩蛋

- 空白入口页新增提示反馈：
  - 点击空白区域时，中间文字会脉冲闪烁。
  - 点击时立即放大一点，脉冲结束后停留在放大后的尺寸。
  - 取消最大上限，连续点击会持续累积放大。
- 入口彩蛋：
  - 第 20 次点击空白区域：
    - `这么着急吗，倒是点击文字呀`
  - 第 100 次点击空白区域：
    - `按钮都这么大了还不点吗？`
  - 小字显示在鼠标上方，跟随鼠标移动，持续 5 秒。
  - 只在对应点击次数触发一次，后续点击不会刷新计时器。

### 7) 第一人称跳跃彩蛋

- 默认禁止跳跃。
- 进入第一人称后：
  - 第一次按空格：
    - 准星上方显示 `在展厅要保持安静，不允许跳跃`
    - 5 秒后消失。
  - 第 20 次按空格：
    - 显示 `真拿你没办法～`
    - 同时解锁跳跃。
- 跳跃参数：
  - 目标高度：0.4 m
  - 总跳跃时间缩短为原有约 80%
  - 实现方式：跳跃期间使用 1.5625 倍重力，并按 0.4 m 计算起跳初速度。
- 音效：
  - 基于现有脚步声生成：
    - `apps/web/public/audio/jump_start.wav`
    - `apps/web/public/audio/jump_land.wav`
  - 走现有 `AudioDirector` / SFX 通道。
  - 音量为脚步声的 1.25 倍。
  - 起跳成功时播放起跳音；本次跳跃落地时播放落地音。

### 8) 展品资产 Excel 同步

- 发现：
  - `docs/assets/exhibit-asset-tracker.xlsx` 是旧版，只包含 `demo_box`。
  - 同目录 CSV 更新到 2026-06-07，已包含 `demo_bass` 和 `exhibit_demo_bass`。
- 处理：
  - 用最新 CSV 重新生成：
    - `docs/assets/exhibit-asset-tracker.xlsx`
  - 同步 sheet：
    - `legend`
    - `scene_assets`
    - `exhibits`
    - `gallery_nodes`
- 验证：
  - `exhibits` 包含 `demo_box`、`demo_bass`
  - `gallery_nodes` 包含 `exhibit_demo_box`、`exhibit_demo_bass`

## 遇到的问题与处理

| 问题 | 处理 |
|------|------|
| `npm run lint` 大量 React hooks error | 将 render-time ref 读写迁移到 effect/state；局部保留 Three imperative mutation 注释 |
| Fast Refresh 报 context 文件混合导出 | 拆分 `GallerySpawnContext`、Provider、hook |
| 生产入口 chunk 过大 | `React.lazy` 拆桌面体验与 Focus；Rolldown groups 拆 vendor |
| 本地模型加载失败 | 将 Draco decoder 从 gstatic 改为本地 `/draco/` |
| demo box Focus 自转偏心 | 只识别明确的 Focus/turntable pivot，否则用视觉中心 |
| 入口彩蛋持续刷新不消失 | 改为只在第 20 / 100 次精确触发 |
| 跳跃时间太长 | 保持 0.4 m 高度，跳跃期间提高重力缩短总时长 |
| Excel 与 CSV 不一致 | 以最新 CSV 重新生成 `.xlsx` |

## 当前验证状态

```text
npm run lint
npm exec -w apps/web tsc -- --noEmit -p tsconfig.app.json
npm run build
find apps/web/dist -type f -size +20M -print
```

- lint：通过
- TypeScript：通过
- build：通过
- dist 大文件检查：无输出
- 已知剩余 warning：Vite vendor chunk 大小提示，主要来自 Rapier / Three。

## 下一步计划

1. **手动 QA 跳跃手感**：确认 0.4 m 高度、80% 时长、起跳/落地音量是否合适。
2. **Focus 三按钮方案**：重新设计按钮 hover / 状态 / billboard，目前仍沿用基础点击动作。
3. **展品资产流程**：以后以 CSV 或 Excel 为单一事实源，避免两者再次不同步。
4. **上线前检查**：确认 `/draco/`、`/audio/`、`/exhibits/` 静态资源在部署环境完整上传。
5. **DevStories 页面**：后续可读取 `docs/devlog/DevLog_*.md` 和 `DevLogSum_*.md` 做展示。

## 相关文件索引

- 入口与彩蛋：`EntrySplash.tsx`，`global.css`
- 跳跃：`PlayerController.tsx`，`SpaceScene.tsx`，`SpaceDesktopExperience.tsx`
- 音频：`AudioDirector.ts`，`AudioContext.tsx`，`audioConfig.ts`，`jump_start.wav`，`jump_land.wav`
- Focus：`FocusOverlay.tsx`，`focusModelFrame.ts`
- GLB / Draco：`GalleryModel.tsx`，`galleryConfig.ts`，`public/draco/`
- 分包：`SpacePage.tsx`，`SpaceDesktopExperience.tsx`，`vite.config.ts`
- 资产表：`docs/assets/exhibit-asset-tracker.xlsx`，`docs/assets/exhibit-asset-tracker-*.csv`
