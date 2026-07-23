# DevLog_9（Architecture V2 · 持久化 SPACE · 新开始界面）

时间：2026-07-15（从 DevLog 8 的项目审查和性能问题记录，推进到 Architecture V2 的实际迁移与交付）

## 这次和上一版有什么不同

DevLog 8 先停下来检查项目，整理 repo、补低风险防护，也记下了 SPACE 的严重性能问题。那一版没有迁移架构，也没有推送交付。

这一版开始迁移 Architecture V2，范围包括代码、测试、浏览器 QA 和 main：

| 对比项 | DevLog 8 | DevLog 9 |
| --- | --- | --- |
| 工作性质 | 审计、低风险修补、记录性能墙 | 全局迁移、运行时重构、交互重做和交付 |
| 应用结构 | 桌面和移动体验已有分流，但入口与生命周期仍然耦合 | App Shell 先分平台，再让桌面 SPACE、桌面 Overlay 和移动 Terminal 各自拥有清晰边界 |
| 3D 生命周期 | 打开页面时容易重复考虑 Canvas、场景和 Pointer Lock | 真实 URL 路由复用同一套 Canvas、Rapier、GLB 和玩家位置 |
| 渲染能力 | WebGPU 是主要路径，失败处理较粗 | WebGPU 优先、WebGL2 回退，并提供“完整 / 简化”两档画质 |
| 性能工作 | 只确认问题严重，需要另开调查 | 建立资产清单、下载/解码/GPU/帧预算、浏览器基线与 release gates |
| 开始体验 | 旧 Splash、点击进入 SPACE 和空白点击彩蛋 | 桌面 3D StartLobby + 移动端纯 DOM/CSS MobileStartMenu，旧入口和彩蛋删除 |
| 交付状态 | 不 push | Architecture V2 已合并并推送到 `main` / `origin/main` |

## 这一轮完成了什么

### 1) App Shell 和平台分流

- 根应用先判断平台，再进入桌面或移动端 Shell，不再一开始就绑上所有桌面 3D 代码。
- 桌面端拥有自己的 StartLobby、SPACE runtime、TopBar、Focus、Profile 和 DevStories 路由。
- 移动端继续走轻量 Terminal Site；开始菜单和正文都不导入 Canvas、Three、R3F、Rapier、GLB 或桌面 renderer。
- Profile、DevStories 和作品页都变成真实 URL，不再只是一个难以恢复的临时 UI 状态。
- 冷打开移动端、Profile、DevStories 和作品内容时，仍然守住 3D 零导入或按需导入边界。

### 2) 持久化 SPACE runtime

- SPACE 拆成持久化 host、Canvas owner、session、route coordinator、HUD 和场景职责，不再由一个页面组件同时管完。
- 从作品 Focus、个人简介或开发日志返回 `/space` 时，会继续使用同一 Canvas、Rapier world、主场景 GLB 和玩家位置。
- 页面切走时记录 pose，返回时恢复镜头与位置，不会为了“返回展馆”重新加载整个 3D 世界。
- Pointer Lock 的返回路径经历了几轮修正：处理了旧请求覆盖新请求、ESC 竞争、overlay 过早卸载和 controls 失活，最终回到 SPACE 后可以直接转动视角，不需要再补一次左键。
- 页面隐藏和恢复也加入 session pose 防护，避免浏览器切页后位置悄悄丢失。

### 3) WebGPU 优先，WebGL2 回退

- renderer profile 统一描述 WebGPU / WebGL2 和“完整 / 简化”两档画质，不让能力判断散在各个组件里。
- WebGPU 初始化失败、设备丢失或浏览器不支持时，可以进入 WebGL2 回退路径。
- “简化”档会降低 DPR、阴影、Bloom、光晕和高成本后处理，同时保留空间雾和基本色彩层级。
- 新增 attempt-scoped SPACE boot controller：每次启动都有独立 generation，旧的异步结果不能覆盖新的重试。
- renderer 的创建、失败释放、重试和 Canvas ownership 都被明确约束，减少黑屏和残留 GPU 状态。

### 4) 桌面和移动端各自的开始菜单

- 桌面端删除旧 EntrySplash、点击进入 SPACE 和空白点击彩蛋，换成独立 3D StartLobby。
- `LIZZARDKEVIN / SPACE / ENTER` 重新调整字距、字号、无边框文字和绿色背景。
- StartLobby 释放自己的 renderer 后才把控制权交给主 SPACE，Rapier 也不会被提前拖进入口 chunk。
- 移动端新增纯 DOM/CSS 的 MobileStartMenu：品牌标题、轻量指针/触摸反馈、键盘 focus、reduced-motion 和一个 Enter，然后进入原有 Terminal Site。
- 移动端正文只在少数关键元素上加入蓝绿色主题色，保持 CLI 感，但没有把语法高亮色当成一套僵硬规则。

### 5) StartLobby 的展品文字背景

- 展品 Excel 成为 title / subtitle 的事实源，生成脚本会输出双语的 StartLobby 文字池；title 与 subtitle 解耦，每一条都能独立进入弹幕。
- 桌面背景现在大约维持 50 条从右向左移动的文字流，每个字符都拥有自己的位置、旋转和速度状态。
- 鼠标附近形成非线性的“黑洞”力场：远处吸引慢、近处更快；快速移开后，已经偏移和旋转的字符保持状态继续向左运动。
- 字符进入指针后会像被搅碎一样，以白色碎片消失；粒子数量不会盖住品牌标题。
- 点阵同时表达力场：形变半径扩大到约 300px，最大位移 30px，最大点半径最后收在 3px。
- 这套背景限制在 30fps、受控 DPR、缓存与可见性裁剪内，并为 `prefers-reduced-motion` 提供降级，避免入口艺术效果反过来成为新的性能墙。

### 6) Focus 媒体按作品真实加载

- 作品入口和 Focus 生命周期被重新整理，快速切换作品时不会残留上一个作品的 loading 状态。
- 首次选中作品后会直接加载该作品的全部图片，并显示真实进度；不会为了追求“零等待”而在大厅里提前预取所有作品媒体。
- 图片、视频和模型页各自处理 metadata、失败和重试，视频早到的 metadata 事件也不会丢失。
- 非当前媒体页不会继续维持无意义的高成本渲染。

### 7) 视觉规范和性能预算

- 我先做同视口截图基线，再固定品牌色、材质层级、雾、轮廓、灯光、HUD、镜头和动效规则。
- 主展馆仍然是第一人称 SPACE，不复制 Messenger 的画面，只借鉴它的世界一致性、强首屏焦点、toon 色块、空间雾、层级和镜头编排。
- 加入资产只读盘点：首批 GLB、Focus GLB、纹理、碰撞网格、音频、public source 资产和缓存头都进入清单。
- 为完整 / 简化两档记录下载、解码、GPU 内存和帧时间预算，并加入浏览器 baseline、candidate report、asset budget 与 protected release gates。
- 这一轮没有改 GLB、Blender 或源资产。KTX2、Meshopt/Draco、静态合并、实例化、LOD 和碰撞简化仍然需要单独授权。

### 8) 交互和可访问性收口

- Toast、空格“不能跳跃”等提示去掉方框，改为文字和发光轮廓。
- ENTER 放大并保留 3D 文字感，桌面 SPACE 标题做光学字距修正。
- 鼠标、触摸、键盘和 reduced-motion 都进入开始菜单与视觉验收。
- Gallery 设置面板、媒体播放键盘控制、音频解锁和页面返回策略也补了针对性边界。

## 问题和处理

| 问题 | 最终处理 |
| --- | --- |
| 从 Overlay 回 SPACE 后仍要多点一次才能转视角 | 不再把它当成简单的 `requestPointerLock()` 调用，而是给每次返回请求加关联标识，取消 stale attempt，保留 overlay 到控制权真正恢复，并确保 controls 始终绑定当前 Canvas |
| StartLobby 偶发纯黑或严格模式重复初始化 | 明确 lobby root owner、viewport 生命周期、renderer release 和 handoff；旧初始化结果不得覆盖新一轮 |
| 想让真实 URL 路由“无额外加载”，又不能让所有内容常驻 | 只持久化已启动的 3D runtime；轻量 Profile/DevStories 可以空闲预取，作品媒体仍按选中后真实加载 |
| 移动端也需要品牌开始页，但不能拖入桌面 3D | Desktop StartLobby 与 MobileStartMenu 完全分开，后者只使用 DOM/CSS，并用 import-graph contract 锁住边界 |
| 数字艺术背景需要逐字符物理感，又不能变成第二个主场景 | 使用轻量 2D 字符状态和点阵场，不引入 Rapier；限制帧率、DPR、粒子数量与 reduced-motion 路径 |
| 本地 main 首轮验证出现 SheetJS 版本不一致 | 对照 lockfile 确认需要 `xlsx@0.20.3`，在 main worktree 重新 `npm ci` 后复验通过，没有用源码补丁掩盖依赖漂移 |

## 验证与交付

这轮执行了针对性的 unit / contract / route / release gate，也在真实浏览器里检查截图、交互、返回视角、窄视口和性能。交付前再次运行：

```text
npm run verify:quick
npm run build:chunks
```

- `verify:quick`：通过。
- `build:chunks`：通过。
- StartLobby 做过真实浏览器截图、鼠标交互和持续运行检查。
- 移动端继续守住 3D 零导入边界。
- Architecture V2 已合并到 `main`，并推送到 `origin/main`；当时的交付提交为 `343d0e8`。
- 本日志在交付后补写，会作为独立提交交接，不和前面的功能提交混在一起。

## 下一步

1. 观察 GitHub Pages 的实际部署结果，确认真实 URL 直接打开、资源 base path 和 SPA fallback 都正常。
2. 用 iPhone Safari 和 Android Chrome 做一轮真机验收，重点看 MobileStartMenu、Terminal 滚动、safe-area、字体 fallback 和触摸反馈。
3. 继续用浏览器 performance / memory 数据盯住完整与简化档，避免视觉调整突破既定帧预算。
4. 如果要进入资产优化，先单独确认范围，再评估 KTX2、Meshopt/Draco、LOD、实例化、碰撞简化和 public source 资产部署策略。
5. 新增 DevStories 时，以 `docs/assets/space-exhibit-index.xlsx` 为网页内容源，通过生成脚本同步，不再手改生成文件。

## 相关文件

- 完整日志：`docs/devlog/DevLog_9.md`
- 摘要：`docs/devlog/DevLogSum_9.md`
- DevStories / 展品内容源：`docs/assets/space-exhibit-index.xlsx`
- 内容生成器：`scripts/generate-space-content.mjs`
- Architecture V2 总计划：`docs/superpowers/plans/2026-07-14-space-architecture-v2.md`
- 视觉规范：`docs/design/space-visual-system-v2.md`
- 资产性能基线：`docs/performance/space-asset-baseline.md`
- StartLobby：`apps/web/src/lobby/StartLobby.tsx`
- 字符黑洞背景：`apps/web/src/lobby/StartLobbyBarrage.tsx`
- 持久化 SPACE host：`apps/web/src/space/SpaceHost.tsx`
- 渲染档位：`apps/web/src/rendering/rendererProfile.ts`
