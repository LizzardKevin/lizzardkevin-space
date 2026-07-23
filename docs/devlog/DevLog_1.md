# DevLog_1（近 4 小时开发记录）

时间：2026-05-28（约 4h）

## 这次想做成什么

把「LizzardKevin Space」的技术骨架先跑通：3D 第一人称漫游、顶栏 / Overlay、基础音频和展品框架。后面导入 `gallery_main.glb` 和展品 Focus glb 时，接口和命名约定得先有。

## 做完了什么

### 1) 项目结构和脚手架

- 项目根目录：`/Users/lizzardkevin/Documents/LizzardKevin Space`
- Workspaces：根目录 `package.json` 以 `apps/web` 为主（Vite + React + TS）
- 启动：
  - `npm run dev`（开发）
  - `npm run build`（构建）

### 2) 顶栏和 Overlay（不中断 SPACE）

顶栏 Tab 改成 Overlay：不切路由，也不卸载 Canvas。下拉 / 回收有一点缓冲动画。进 Overlay 会释放 pointer lock；退出后回到 SPACE，位置还在。

相关文件：`apps/web/src/App.tsx`、`apps/web/src/components/TopBar.tsx`、`apps/web/src/overlay/OverlayLayer.tsx`。

### 3) 第一人称移动

不再用坦克式平移，改成 Rapier 的 KinematicCharacterController 风格：有重力、会贴地、能滑墙，走路带一点 head-bob。WASD 跟着视角走，接近常见 FPS。

相关文件：`apps/web/src/scenes/Player/PlayerController.tsx`、`apps/web/src/scenes/SpaceScene.tsx`。

### 4) glb 碰撞约定：`COL_`

识别 `COL_` 碰撞网格，生成静态 trimesh，并把碰撞网格藏起来。约定写在 `docs/asset-manifest.md`，实现在 `apps/web/src/scenes/collision/colColliders.tsx`。

### 5) 展品 Focus 最小闭环

- `apps/web/public/exhibits/manifest.json` + `apps/web/src/exhibits/manifest.ts`
- Focus overlay：全屏暗化 / 模糊，OrbitControls 转 Focus glb（`apps/web/src/exhibits/FocusOverlay.tsx`）
- 音频播放内核 + 底部进度条，音视频后面共用（`apps/web/src/media/PlaybackContext.tsx`、`apps/web/src/media/PlaybackBar.tsx`）

### 6) 视觉和字体（临时）

灰墙、白地面、环境光调亮一点方便看清。Toon + Bloom 骨架先留着。全局用系统无衬线字体栈（`apps/web/src/styles/global.css`）。

### 7) 部署方向

写了腾讯云 COS + CDN 的静态站和大资源（glb / mp3 / mp4）组织建议：`docs/tencent-cloud-deploy.md`。

## 卡住过的地方

Chrome 进出鼠标锁定会弹系统提示，网页藏不掉。只能少切换，交互上绕开。

## 下一步

1. 真正启用 `gallery_main.glb`：放进 `apps/web/public/models/gallery_main.glb`，打开 `apps/web/src/scenes/SpaceScene.tsx` 的加载开关，核对 `COL_` 是否生效。
2. 展品按钮映射：按 manifest，点 Focus glb 上的按钮 mesh 就能 play / pause / seek。
3. 视频通道：接上 `videoUrl`，进度同步到 `PlaybackBar`。
4. 脚步声：按 `FOOT_*` 或 zone 切样本，再做简单音量 UI。
5. 视觉：雾、颜色层级、Bloom 阈值；阴影策略（AO / lightmap vs 局部实时）之后再定。
6. 内容：本地 JSON / Markdown（`manifest.json`、`content.json`、`docs/devlog/`）。
