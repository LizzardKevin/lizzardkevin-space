# SPACE 全息小地图:模型来源两条实现路径(存档)

日期:2026-08-06 · 分支:kimi/ui_redesign · 相关代码:`apps/web/src/space/minimap/`

地图的显示模型有两条可切换的路径,开关是 `minimapModel.ts` 里的
`SPACE_MINIMAP_SOURCE: "strip" | "hologram"`。两条路径都保留在代码库中,
本文件记录各自的具体处理方式,防止回退/再切换时丢失实现细节。

## 路径 A:hologram —— 离线生成的剥离 GLB(当前启用)

模型文件:`apps/web/public/models/space_minimap_strip.glb`(1,393,312 B ≈ 1.36 MB,
71,117 顶点,94 个节点:21 块楼板 `MAP_FLOOR_*` + 72 段楼梯 `MAP_STAIR_*` 逐块导出
+ 合并墙体 `MAP_WALL_STRIP`,**保留展厅世界坐标**)。步行面逐块保留是站立检测与
逐块点亮的前提。

生成方式(与运行时 strip 完全同一套代码,产物永远一致):

```bash
npm run minimap:generate   # = node scripts/generate-space-minimap-glb.mjs
```

脚本自起临时 vite + headless Chrome,在页面里执行
`apps/web/tools/export-space-minimap.ts`:`GLTFLoader`(本地 draco)加载
`space_main.glb` → `prepareGalleryScene`(与主场景相同的可见性/去重处理)→
`buildSpaceMinimapModel`(下述收集/分层规则)→ `GLTFExporter` 写出 GLB。
**展厅模型更新后重跑该脚本即可同步小地图**;生成后 bump
`SPACE_MINIMAP_GLB_REVISION` 让缓存失效。

因为 GLB 保留世界坐标,玩家点直接读 `pose.position`(`SPACE_MINIMAP_GLB_WORLD_ALIGNED = true`,
不启用包围盒映射)。

## 路径 B:strip —— 运行时从 space_main 剥离(回退/调试用)

零资产管线,模型直接来自 `useGLTF` 缓存的主场景(世界坐标):

1. **收集**(`collectSpaceMinimapSources`):遍历缓存场景,仅保留可见且名字命中
   `ARCH_ / PLASTER_ / STRUCT_` 前缀的网格,并排除地图缩尺下读作"三角破面"的
   细节族(`SPACE_MINIMAP_STRIP_EXCLUDE_PATTERNS`:`*_CEILING_*` 顶盖(开顶读楼层)、
   `ARCH_STAIR_PLASTER_WHITE_*` 楼梯细部、以及主场景墨线豁免的坡面灰泥系列
   `ARCH_WALL_PLASTER_WHITE_013..022`)。`COL_` 碰撞体、`EXHIBITS_` 展品、
   `GLASS_`/`METAL_ALUMINUM_`/灯具/spawn 不命中前缀;主场景 `prepareGalleryScene`
   已隐藏的 z-fight 重复面也随 `visible=false` 跳过。
2. **世界空间化**(`toSpaceMinimapWorldGeometry`):每个网格只克隆
   `position + index`(材质全部丢弃),`applyMatrix4(matrixWorld)` 到世界空间;
   非索引几何补顺序索引,保证 `mergeGeometries` 可用。
3. **分层合并**(`resolveSpaceMinimapLayer`):按名字分三层 —
   `STRUCT/ARCH_FLOOR_*` 与 `*_STAIR_*` → `floor`;`PLASTER_`、含 `_WALL_`/`_CEILING_` → `wall`;
   其余 → `other`(当前过滤口径下通常为空)。每层各自合并成单一几何,
   删除 normal(纯白 basic 材质不需要光照),合并包围盒得 center/radius。
4. **墨线壳**:只对 `getGalleryMaterialStyleAction(name) === "stylize"` 且不在
   地面/楼梯排除清单的面生成,`createInkShellGeometry(sources, 0.08)`(比主场景
   0.035 粗,补偿缩尺读感)。
5. **玩家点**:模型在世界坐标系内,`pose.position` 直接使用,无需映射。

代价:剥离遍历 + 顶点复制是一次性启动开销;几何在第二个 GL 上下文里再上传一份。
优点:模型永远和主场景同步,主场景 GLB 一换地图自动跟随。

## 历史:已弃用的 Codex 手工减面 GLB

`space_hologram_map.glb`(499KB / 1.4 万顶点,`MAP_FLOOR/WALL/STAIR` 三网格,
局部归一坐标)已删除。它是手工减面产物,与运行时剥离口径不一致(破面来源)。
若未来再接局部归一坐标的 GLB:`SPACE_MINIMAP_GLB_WORLD_ALIGNED` 置 false,
玩家点改走 `computeSpaceArchitectureBounds`(主场景建筑包围盒)+
`createSpaceMinimapWorldMapper`(中心对齐 + 半径均匀缩放);若导出时 Blender
场景有旋转/镜像,点的水平方位会差一个固定角度,需在映射里补固定旋转常量。

## 两条路径共享的部分

- 材质:步行面逐块 `MeshBasicMaterial`(paper 白,toneMapped:false,depthWrite:false;
  楼板默认 0.34、楼梯默认 0.08 近隐形),墙体/其余合并同材质(0.10/0.18),
  外加本地半透明墨线(ink,BackSide,0.28)。
- **站立面点亮**(`minimapFloorDetect.ts` + 组件内补间):纯空间判定 ——
  脚底 y = pose.y − 0.9,楼板取"顶面不超过脚底容差(0.35m)的最高一块",
  楼梯按竖直跨度包含判定且优先于楼板;命中块的材质以**非线性补间**过渡到
  墨绿半透明(#2f5d52,opacity 0.6):点亮 easeOutBack 260ms 微回弹,
  熄灭 easeInOutCubic 420ms 缓收;reduced-motion 直接切换不补间。
- 相机:正交 heading-up(方位角 = 玩家 yaw),仰角 0.42 + pitch × 0.16 反向轻微跟随
  (钳制 0.16–0.66),reduced-motion 下吸附不走阻尼;30fps 独立 rAF。
- 玩家点:signal 橙,`depthTest:false` 穿墙,半径 = 地图半径 × 0.03(钳 0.4–1.6)。
- 组件级 `opacity: 0.62` 淡出(CSS `.space-minimap[data-visible]`)。
