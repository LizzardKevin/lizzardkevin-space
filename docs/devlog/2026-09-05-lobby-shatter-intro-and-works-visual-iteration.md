# 2026-09-05 记录:开始页 3D Shatter Intro 与作品页视觉迭代

承接 Phase 2(`48bc368`)。本轮包含四个迭代任务与三个修复,全部真机目视验收。

## 一、开始页 Intro(两轮迭代后的最终形态)

- **3D 模型本身 shatter**:`LIZZARDKEVIN`/`SPACE` 是 R3F 裸挂载的挤出文字(TextGeometry + MeshToonMaterial)。Intro 改为**逐面爆炸的逆放**:几何非索引化后按面心生成确定性随机方向/旋转轴/延迟(seed 固定),shader 以 `shatterProgress` uniform 驱动(1=完全炸开 → 0=聚合),GPU 侧位移旋转,CPU 不逐帧写 attribute;两行标题错相聚合。碎片可见挤出体积的明暗侧面,是真正的"模型裂开再聚合",不再有 2D 文字交接。新增 `startLobbyShatterMaterial.ts`/`startLobbyIntroShatter.ts`;废弃离屏 2D 文字采样方案。
- **白场线性渐退**:DOM/CSS 覆盖层,白色场自上而下线性扫出(950ms),无径向圆孔径。
- 保留:reduced-motion 完全不出现 intro、pointerdown 跳终态、播放期临时连续帧(结束恢复 demand)、弹幕 60fps(`FRAME_MS = 1000/60`)、音频解锁与 Enter 行为。
- 契约新增断言:"shatters the 3D text model itself instead of sampling 2D type"。

## 二、作品页视觉迭代

- **地面密度跨作品一致**:地面半径 = 视距 × 4.76(treehabitat 60 不变,3d_printing 60→9.02),点数恒定 25k——半径∝视距时圆盘角面积恒定,屏幕空间密度自相似一致;±30° 视差下三边缘覆盖保持。
- **入场波浪**:阈值 = 深度×0.5 + 高度×0.5(远+底最先,近+顶最晚)+ 15% 抖动;时长 2.2s、单点黄→白窗口 0.2(≈0.44s);新增 uniforms `introYMin/introYMax`;`?wpIntro=0..1` dev 钩子。
- **两段式滚动**:Hero(标题/简介/粒子)→ `#work-media`(video+gallery 合并);删 Overview/Story/Spec;顶栏锚点只剩 MED;解构锚点改 `#work-media`(无媒体退化为页尾);无吸附,中途可停。
- **散开态 50% 透明度**:绑定 morphProgress(成形 100% ↔ 散开 50%),mask 与透明度分离相乘。
- **边缘导航 WorkEdgeNav**:固定视口左右边缘、垂直居中;常态 7×11 位图 ASCII 密文箭头(12fps 换字+明暗抖动),hover 从指针侧解密成作品名;**无底框/边框/棱条**,密文直接浮于页面,可读性用双层文字光晕;reduced-motion 停闪。
- **滚动 60fps**:`new Spherical` 改实例复用、视差收敛跳过相机重写,帧路径零分配;`?wpPerf=1` 帧时日志。

## 三、修复

1. **初始位姿闪现**:收敛跳过优化使 `setParticleData` 之后设置的 `viewOffsetFactor` 永不生效,首次动鼠标时模型跳到右移位。修法:host 先设 offset 再 setParticleData;`viewOffsetFactor` 改 getter/setter + `cameraPoseDirty` 脏标记,收敛跳过尊重脏标记。
2. **契约断言中间态**:`work-particle-host` 契约曾断言 data 属性过渡接线,真实接线后改为锁定 `<WorkEdgeNav>` 传参与无玻璃拟态。
3. canvasUI 认知纠正:用户指定 canvasui.dev(另一 worktree 有接入配置,未提交);本轮 Shatter/Decrypt 语义按自实现落地(零新依赖、规避实验性 HTML-in-Canvas)。

## 验证

- `verify:quick` / `build:chunks` 全绿(多轮复跑);lobby 16/16、particles 20+/20+、works 7/7 测试通过。
- 无头截图:intro 白场→碎片飞入→聚合→终态四段确认;三作品地面密度一致;波浪 p0.3/0.5/0.7 下→上推进;模型初始即右移;边缘导航无框浮字。
