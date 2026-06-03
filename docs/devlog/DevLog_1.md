# DevLog_1（近 4 小时开发记录）

时间：2026-05-28（约 4h）

## 本次目标

- 从零把「LizzardKevin Space」的技术骨架跑起来：3D 第一人称漫游 + 顶栏/Overlay + 基础音频与展品框架，并为后续导入 `gallery_main.glb` 与展品 Focus glb 做好接口与规范。

## 已完成产出（可直接运行）

### 1) 项目结构与开发脚手架

- 项目根目录：`/Users/lizzardkevin/Documents/LizzardKevin Space`
- Workspaces：根目录 `package.json` 以 `apps/web` 为主（Vite + React + TS）
- 启动：
  - `npm run dev`（开发）
  - `npm run build`（构建）

### 2) 顶栏与 Overlay（不中断 SPACE）

- 顶栏 Tab 改成 **Overlay 模式**（不切路由，不卸载 Canvas），并加入下拉/回收动画（带缓冲）。
- 进入 Overlay 时释放 pointer lock；退出 Overlay 时回到 SPACE（继续原位置）。
- 相关实现：
  - `apps/web/src/App.tsx`
  - `apps/web/src/components/TopBar.tsx`
  - `apps/web/src/overlay/OverlayLayer.tsx`

### 3) 第一人称移动：重力/碰撞/手感

- 从“坦克式/运动学平移”升级为 Rapier 的 **KinematicCharacterController** 风格：
  - 重力下落
  - 地面吸附与滑墙
  - 轻微 head-bob（走路视角小幅晃动）
  - WASD **随视角方向移动**（现代 FPS）
- 相关实现：
  - `apps/web/src/scenes/Player/PlayerController.tsx`
  - `apps/web/src/scenes/SpaceScene.tsx`

### 4) glb 碰撞约定：`COL_` 自动识别

- 新增对 `COL_` 碰撞网格的识别与生成静态 trimesh 碰撞（并隐藏碰撞网格）。
- 相关实现：
  - `apps/web/src/scenes/collision/colColliders.tsx`
- 建模约定文档：
  - `docs/asset-manifest.md`

### 5) 展品 Focus glb + manifest + 播放进度条（最小闭环）

- 建立 `public/exhibits/manifest.json`（示例结构）与加载器：
  - `apps/web/public/exhibits/manifest.json`
  - `apps/web/src/exhibits/manifest.ts`
- Focus overlay：全屏暗化/模糊 + 旋转/缩放查看 Focus glb（OrbitControls）：
  - `apps/web/src/exhibits/FocusOverlay.tsx`
- 音频播放内核 + 底部统一进度条（音视频将共用此 UI）：
  - `apps/web/src/media/PlaybackContext.tsx`
  - `apps/web/src/media/PlaybackBar.tsx`

### 6) 视觉与字体（临时方案）

- 灰墙 + 白地面 + 更亮环境光（方便看清），保留 Toon + Bloom 骨架。
- 全局系统无衬线字体栈：
  - `apps/web/src/styles/global.css`

### 7) 国内部署方向（腾讯云）

- 文档：腾讯云 COS + CDN 的静态站 + 大资源（glb/mp3/mp4）组织建议：
  - `docs/tencent-cloud-deploy.md`

## 遇到的问题与处理

- **Pointer Lock 系统提示框**：Chrome 会在进入/退出鼠标锁定时显示系统级提示，这是浏览器安全机制，网页无法隐藏；因此以交互设计减少频繁切换为主（保留现状）。
- **Sanity Studio 与 Node v26 兼容**：Sanity CLI 在 Node v26 下触发依赖链 ESM/CJS 问题，已记录说明：
  - `docs/sanity-note.md`（建议切 Node 20 LTS 再启用 Studio）

## 下一步计划（简要）

1. **真正启用 `gallery_main.glb`**：放入 `apps/web/public/models/gallery_main.glb`，并打开 `SpaceScene.tsx` 的加载开关；验证 `COL_` 碰撞网格是否工作。\n2. **展品按钮映射**：按 manifest 规则实现“点击 Focus glb 上的按钮 mesh → play/pause/seek”完整链路（替换当前临时播放按钮）。\n3. **视频通道**：接入 `videoUrl`（HTMLVideoElement + 进度同步到 `PlaybackBar`），并支持按钮控制。\n4. **脚步声与地面材质映射**：基于 `FOOT_*` 或 zone 规则切换脚步样本，并做基础音量 UI。\n5. **视觉打磨**：Firewatch-ish 的雾、颜色层级、Bloom 阈值与亮度；之后再讨论阴影策略（AO/lightmap vs 局部实时阴影）。\n6. **内容接入**：等你决定 Node 版本后再启用 Sanity Studio，或先用本地 JSON/MDX 作为内容源。\n
