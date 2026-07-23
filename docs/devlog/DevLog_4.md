# DevLog_4（Cursor → Codex 接管 · 质量修复 · 入口彩蛋 · 跳跃彩蛋）

时间：2026-06-07 ~ 2026-06-08（Codex App Projects 接管后多轮会话）

## 这次想做成什么

把原先 projectless chat / Cursor 里的上下文迁到 Codex App Projects，在本地仓库 `LizzardKevin Space` 继续做。先把 P1 lint 堵点清掉，让 `npm run lint`、TypeScript、生产构建都能再验。顺带处理主入口过大、旧 `dist` 误导、Draco decoder 外网依赖。入口白屏、Focus、第一人称继续打磨，加了几处隐藏彩蛋。展品 Excel 也跟最新 CSV / manifest 里的 `demo_box` / `demo_bass` 对齐。

## 做完了什么

### 1) Codex 接管和基线

项目固定在 `/Users/lizzardkevin/Documents/LizzardKevin Space`，仓库 `LizzardKevin/lizzardkevin-space`。用户已有的未提交改动（`BlenderFile/gallery_main.blend1`）没动。基线跑过：`npm run lint`、`tsc --noEmit`、`npm run build`。旧 `apps/web/dist` 里残留的大 GLB 被重新 build 盖掉；`find apps/web/dist -type f -size +20M -print` 没有输出。

### 2) React hooks lint

新规则踩到的地方：

- render 里写 ref：`FocusCanvasInput.tsx`、`focusDoubleClick.ts`、`PlayerController.tsx`、`ExhibitRaycast.tsx`
- render 里读 ref：`PlaybackBar.tsx`、`FocusOverlay.tsx`
- effect 里同步 setState：`ExhibitTargetLabel.tsx`、`PlaybackBar.tsx`、`FocusOverlay.tsx`
- R3F / Three 的 imperative mutation：只留必要的局部 eslint 注释

`GallerySpawnContext.tsx` 拆成 `GallerySpawnContext.ts`、`GallerySpawnProvider.tsx`、`useGallerySpawn.ts`。`PlaybackBar` 改成显式 retained state，避免 render-time ref 缓存，淡入淡出还在。

### 3) 分包

`SpaceDesktopExperience` 和 `FocusOverlay` 都改 `React.lazy`。`vite.config.ts` 加了 Vite 8 / Rolldown `codeSplitting.groups`，拆出 `react-vendor`、`three-vendor`、`rapier-vendor`。主入口 chunk 从大约 4.2 MB 掉到约 148 KB；`SpaceDesktopExperience` 约 28 KB，`FocusOverlay` 约 10 KB。Rapier / Three 的 vendor warning 还在，体积本来就大。

### 4) Draco decoder 本地化

`gallery_main.glb` 是 Draco 压缩的。`@react-three/drei/useGLTF` 默认去 `https://www.gstatic.com/draco/...` 拉 decoder，本地预览经常失败，表现成出生点怪、WASD 无效。改成本地：

- `apps/web/public/draco/draco_decoder.js`
- `apps/web/public/draco/draco_decoder.wasm`
- `apps/web/public/draco/draco_wasm_wrapper.js`

`galleryConfig.ts` 加 `GLTF_DRACO_DECODER_PATH = "/draco/"`；`GalleryModel.tsx` 和 `FocusOverlay.tsx` 的 `useGLTF` / `preload` 都走本地。

### 5) Focus 旋转中心

`demo_box` 自转中心不对。GLB 里有个普通空节点叫 `pivot`，旧逻辑见 `pivot` 就当旋转中心。`focusModelFrame.ts` 现在只认 `focus_pivot`、`turntable_pivot`、`*_focus_pivot`、`*_turntable_pivot`；没有专用 pivot 就用视觉包围盒中心。

### 6) 入口白屏和彩蛋

点空白区域时，中间文字会脉冲闪一下，并立刻放大一点；脉冲结束后停在放大后的尺寸，没有上限，连点会一直变大。

彩蛋：

- 第 20 次：`这么着急吗，倒是点击文字呀`
- 第 100 次：`按钮都这么大了还不点吗？`

小字跟在鼠标上方，持续 5 秒；只在对应次数触发一次，后面不会刷新计时器。

### 7) 第一人称跳跃彩蛋

默认不能跳。进第一人称后：

- 第一次按空格：准星上方 `在展厅要保持安静，不允许跳跃`，5 秒后消失
- 第 20 次：`真拿你没办法～`，同时解锁跳跃

参数：目标高度 0.4 m；总时长大约是原来的 80%；跳跃期间用 1.5625 倍重力，按 0.4 m 算初速度。音效从脚步声衍生出 `apps/web/public/audio/jump_start.wav` / `apps/web/public/audio/jump_land.wav`，走现有 `AudioDirector` / SFX，音量是脚步的 1.25 倍。起跳成功时播放起跳音，本次跳跃落地时播放落地音。

### 8) 展品 Excel

`docs/assets/exhibit-asset-tracker.xlsx` 还是旧的，只有 `demo_box`；`docs/assets/exhibit-asset-tracker-*.csv` 已更新到 2026-06-07，带上 `demo_bass`。用最新 CSV 重生成 xlsx，同步 `legend` / `scene_assets` / `exhibits` / `gallery_nodes`。验证过 `exhibits` 有 `demo_box`、`demo_bass`，`gallery_nodes` 有 `exhibit_demo_box`、`exhibit_demo_bass`。

## 问题和处理

| 问题 | 处理 |
|------|------|
| hooks lint 一堆 error | render-time ref 读写迁到 effect / state；Three mutation 局部留注释 |
| Fast Refresh 抱怨 context 混合导出 | 拆 Context / Provider / hook |
| 生产入口太大 | lazy 拆桌面体验和 Focus；Rolldown 拆 vendor |
| 本地模型加载失败 | Draco 从 gstatic 改本地 `/draco/` |
| demo box 自转偏心 | 只认 Focus / turntable pivot |
| 入口彩蛋一直刷新 | 只在第 20 / 100 次精确触发 |
| 跳跃时间太长 | 高度仍 0.4 m，跳跃时加大重力 |
| Excel 和 CSV 不一致 | 以最新 CSV 重生成 xlsx |

## 验证

```text
npm run lint
npm exec -w apps/web tsc -- --noEmit -p tsconfig.app.json
npm run build
find apps/web/dist -type f -size +20M -print
```

lint / TypeScript / build 都过；dist 大文件检查无输出。剩下的是 Vite vendor chunk 体积提示（Rapier / Three）。

## 下一步

1. 手测跳跃：0.4 m、约 80% 时长、起跳 / 落地音量。
2. Focus 三按钮方案重做。
3. 展品资产以后只认 CSV 或 Excel 其中一个事实源。
4. 上线前确认 `/draco/`、`/audio/`、`/exhibits/` 都传全。
5. DevStories 页面后续读 `docs/devlog/DevLog_*.md` / `docs/devlog/DevLogSum_*.md`。

## 相关文件

- 入口与彩蛋：`EntrySplash.tsx`，`global.css`
- 跳跃：`PlayerController.tsx`，`SpaceScene.tsx`，`SpaceDesktopExperience.tsx`
- 音频：`AudioDirector.ts`，`AudioContext.tsx`，`audioConfig.ts`，`jump_start.wav`，`jump_land.wav`
- Focus：`FocusOverlay.tsx`，`focusModelFrame.ts`
- GLB / Draco：`GalleryModel.tsx`，`galleryConfig.ts`，`public/draco/`
- 分包：`SpacePage.tsx`，`SpaceDesktopExperience.tsx`，`vite.config.ts`
- 资产表：`docs/assets/exhibit-asset-tracker.xlsx`，相关 CSV
