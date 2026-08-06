# SPACE 全息小地图:模型来源两条实现路径(存档)

日期:2026-08-06 · 分支:kimi/ui_redesign · 相关代码:`apps/web/src/space/minimap/`

地图的显示模型有两条可切换的路径,开关是 `minimapModel.ts` 里的
`SPACE_MINIMAP_SOURCE: "strip" | "hologram"`。两条路径都保留在代码库中,
本文件记录各自的具体处理方式,防止回退/再切换时丢失实现细节。

## 路径 A:strip —— 运行时从 space_main 剥离(当前启用)

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

## 路径 B:hologram —— 独立减面 GLB

模型文件:`apps/web/public/models/space_hologram_map.glb`(2026-08-06 由 Codex
经 Blender MCP 从 space_main 减面导出;499KB、1.4 万顶点、3 个网格
`MAP_FLOOR_MAIN / MAP_WALL_MAIN / MAP_STAIR_MAIN`、无 draco、变换已应用、
**局部归一坐标**:贴地 y=0、x/z 居中,不与主场景共享世界坐标)。

1. **直载**:`useGLTF(SPACE_HOLOGRAM_GLB_URL, false)`(无 draco,关 decoder)。
2. **分层合并**:`buildSpaceHologramModel` 不做前缀过滤(GLB 已是纯建筑壳),
   只按 `MAP_` 名字分层(MAP_FLOOR_/MAP_STAIR_ → floor,MAP_WALL_ → wall),
   墨线壳对全部网格生成。修订号:`SPACE_HOLOGRAM_GLB_REVISION`,换文件时 bump。
3. **玩家点映射**(`createSpaceMinimapWorldMapper`):局部坐标与世界坐标的换算 —
   主场景建筑包围盒(同 strip 第 1 步的收集口径,只读几何 bbox 不复制顶点)
   与地图包围球做**中心对齐 + 半径均匀缩放**,玩家世界坐标映射进地图局部框。
   注意:若未来重导 GLB 时 Blender 场景发生旋转/镜像,点的水平方位会差一个
   固定角度,需要在映射里补一个固定旋转常量。

代价:多一个资产文件要维护(主场景改版时需重新导出)。优点:渲染/内存开销最小。

## 两条路径共享的部分

- 材质:三层 `MeshBasicMaterial`(paper 白,toneMapped:false,depthWrite:false,
  opacity floor 0.34 / wall 0.10 / other 0.18)+ 本地半透明墨线(ink,BackSide,0.28)。
- 相机:正交 heading-up(方位角 = 玩家 yaw),仰角 0.42 + pitch × 0.16 轻微跟随
  (钳制 0.16–0.66),reduced-motion 下吸附不走阻尼;30fps 独立 rAF。
- 玩家点:signal 橙,`depthTest:false` 穿墙,半径 = 地图半径 × 0.03(钳 0.4–1.6)。
- 组件级 `opacity: 0.62` 淡出(CSS `.space-minimap[data-visible]`)。
