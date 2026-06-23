# space_main.glb Mesh 命名规范

本文档定义生产主场景 `BlenderFile/space_main.blend` 与 `apps/web/public/models/space_main.glb` 内所有 **Object / Mesh** 的命名规则，供 Blender 建模、导出与运行时解析共用。`gallery_main` 仅保留为历史 demo / 测试资产，不再作为生产展厅空间。

与 [`asset-manifest.md`](asset-manifest.md)（展品 manifest 绑定）配合使用。

---

## 1. 总则

### 1.1 字符与格式

| 规则 | 说明 |
|------|------|
| 字符集 | 小写英文字母 `a–z`、数字 `0–9`、下划线 `_` |
| 禁止 | 空格、中文、连字符 `-`、点号 `.`、特殊符号 |
| 分隔 | 仅使用 `_`；不用 CamelCase |
| 唯一性 | **同一 glb 内 mesh 名全局唯一**（含碰撞体） |
| 稳定性 | 一旦上线，改名 = 破坏 manifest / CMS 绑定，需同步改配置 |

### 1.2 命名结构（推荐）

```
<prefix>_<domain>_<descriptor>[_<variant>]
```

示例：`struct_wall_north_01`、`COL_wall_north`、`exhibit_demo_box_body`

- **prefix / 域**：表明用途（结构、碰撞、展品等）
- **descriptor**：位置、材质、朝向、序号
- **variant**：同类型第 2、3 个实例用 `_01` `_02`…

### 1.3 层级 vs 扁平

- **推荐**：Blender 里用 Empty 分组，但 **参与导出的 Mesh 仍须唯一命名**。
- **碰撞体**：可与视觉 mesh 分离（低面数），命名独立加 `COL_` 前缀。
- **展品子部件**：挂在展品 Empty 下，命名 `exhibit_<id>_<part>`；**仅「交互根 mesh」使用纯 `exhibit_<id>`**（见 §6）。

### 1.4 材质与颜色

**行业惯例**：颜色 / 材质主要由 **Blender Material 名** 管理，mesh 名只表达几何与语义。

| 层级 | 命名 | 示例 |
|------|------|------|
| Material | `mat_<surface>_<color或finish>` | `mat_wall_plaster_white`、`mat_metal_brushed_dark` |
| Mesh（可选后缀） | 仅当同一逻辑件有多种材质分 mesh 时 | `struct_floor_tile_a`、`struct_floor_tile_b` |

运行时目前 **不解析** mesh 名中的颜色后缀；颜色由 glTF 材质贴图/因子决定。

### 1.5 `space_main` 生产材质恢复规则（2026-06-23）

当前 `space_main.blend` 仍使用 Rhino/Blender 导入后的生产对象名前缀（大写），后续重新导入或替换几何时，按对象名恢复材质即可保留网页端观感。可直接运行：

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  BlenderFile/space_main.blend --python scripts/apply-space-main-materials.py
```

Windows / PowerShell 中建议先设 Blender 路径，避免 Codex 找不到 GUI app；路径里的 Blender 版本号按本机安装版本替换：

```powershell
$BLENDER = "C:\Program Files\Blender Foundation\Blender 4.3\blender.exe"
& $BLENDER --background BlenderFile/space_main.blend --python scripts/apply-space-main-materials.py
```

如果 Windows 已把 Blender 加入 PATH，也可以直接用：

```powershell
blender --background BlenderFile/space_main.blend --python scripts/apply-space-main-materials.py
```

该脚本会保存 `BlenderFile/space_main.blend` 并重新导出 `apps/web/public/models/space_main.glb`。材质只使用 glTF 基础 PBR metallic/roughness、alpha blend 与 `KHR_materials_emissive_strength`，避免 transmission / clearcoat / IOR / specular 等 WebGPU 路径下更容易不稳定或退化的高级扩展。

**权威脚本文件**：[`scripts/apply-space-main-materials.py`](../scripts/apply-space-main-materials.py)。后续调色、金属度、粗糙度、透明度、LED 强度，优先修改该脚本内 `MATERIAL_SPECS`，再重新跑脚本；不要只在 Blender UI 里手动改材质，否则下次重新导入模型时容易丢失。

完整的 Rhino 重导入、collection 重建、spawn 设置和 Windows 批处理流程，见 [`space-main-rhino-reimport-runbook.md`](./space-main-rhino-reimport-runbook.md)。

**材质脚本当前参数**：

| Material | Base Color / Alpha | Metallic | Roughness | Blend | Emission |
|---|---:|---:|---:|---|---|
| `mat_arch_plaster_warm_white` | `(0.92, 0.92, 0.92, 1.0)` | `0.08` | `0.72` | `OPAQUE` | - |
| `mat_floor_concrete_warm_gray` | `(0.37, 0.37, 0.37, 1.0)` | `0.06` | `0.76` | `OPAQUE` | - |
| `mat_stair_warm_concrete` | `(0.37, 0.37, 0.37, 1.0)` | `0.06` | `0.76` | `OPAQUE` | - |
| `mat_metal_aluminum_soft` | `(0.90, 0.90, 0.90, 1.0)` | `0.74` | `0.18` | `OPAQUE` | - |
| `mat_glass_frosted_soft` | `(0.74, 0.76, 0.76, 0.42)` | `0.0` | `0.42` | `BLEND` | - |
| `mat_glass_clear_soft` | `(0.84, 0.86, 0.86, 0.32)` | `0.0` | `0.14` | `BLEND` | - |
| `mat_led_generic_warm_emissive` | `(1.0, 0.94, 0.78, 1.0)` | `0.0` | `0.30` | `OPAQUE` | color `(1.0, 0.90, 0.66, 1.0)`, strength `2.8` |
| `mat_collision_helper_transparent_red` | `(1.0, 0.08, 0.02, 0.22)` | `0.0` | `0.35` | `BLEND` | - |

**对象名前缀到材质的脚本映射**（函数 `material_for_object_name`）：

| Object / Mesh 前缀 | Material |
|---|---|
| `COL_*` | `mat_collision_helper_transparent_red` |
| `LIGHT_GENERIC_LIGHT_*` | `mat_led_generic_warm_emissive` |
| `STRUCT_STAIR_*` | `mat_stair_warm_concrete` |
| `ARCH_FLOOR_*`、`STRUCT_FLOOR_*` | `mat_floor_concrete_warm_gray` |
| `METAL_ALUMINUM_*` | `mat_metal_aluminum_soft` |
| `GLASS_CLEAR_*` | `mat_glass_clear_soft` |
| `GLASS_FROSTED_*`、其他 `GLASS_*` | `mat_glass_frosted_soft` |
| `ARCH_*`、`STRUCT_WALL_*`、`STRUCT_CEILING_*` | `mat_arch_plaster_warm_white` |

**材质脚本导出约定**：

| 导出参数 | 当前值 / 意图 |
|---|---|
| 输出路径 | `apps/web/public/models/space_main.glb` |
| `export_format` | `GLB` |
| `export_materials` | `EXPORT`，保留 Blender/glTF 材质 |
| `export_vertex_color` | `ACTIVE`，材质脚本与 vertex AO 方案会导出 active `Color` |
| `export_vertex_color_name` | `Color` |
| `export_lights` / `export_cameras` / `export_animations` | 全部 `False` |
| Draco | `export_draco_mesh_compression_enable=False`，当前资产不需要压缩 |
| 坐标 | `export_yup=True` |
| 隐藏对象 | `use_visible=False`、`use_renderable=False`，确保 `COL_*` 等合同节点仍导出，运行时再隐藏 |

重新导出 GLB 后，记得同步更新 [`apps/web/src/scenes/gallery/galleryConfig.ts`](../apps/web/src/scenes/gallery/galleryConfig.ts) 的 `GALLERY_GLB_REVISION`，否则浏览器可能继续用旧缓存。

如需给墙脚、楼梯根部、金属格栅交界处增加结构阴影，可运行：

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  BlenderFile/space_main.blend --python scripts/bake-space-main-ao.py
```

该脚本会把 AO bake 到结构/金属 mesh 的 `Color` 顶点色并以 glTF `COLOR_0` 导出。当前参数：`ARCH_*`、`STRUCT_STAIR_*`、`METAL_ALUMINUM_*` 接收 AO；`COL_*`、`GLASS_*`、`LIGHT_GENERIC_LIGHT_*` 不作为 AO occluder；AO remap 下限 `0.62`、强度 `0.38`，用于让角落读得出来但不压黑整个空间。

**Vertex-color AO 参数**（[`scripts/bake-space-main-ao.py`](../scripts/bake-space-main-ao.py)）：

| 参数 | 当前值 / 说明 |
|---|---|
| `AO_ATTR_NAME` | `Color`，导出为 glTF `COLOR_0` |
| `AO_TARGET_PREFIXES` | `("ARCH_", "STRUCT_STAIR_", "METAL_ALUMINUM_")` |
| `AO_RECEIVER_PREFIXES` | `("ARCH_", "STRUCT_STAIR_", "METAL_ALUMINUM_")` |
| `AO_EXCLUDED_OCCLUDER_PREFIXES` | `("COL_", "GLASS_", "LIGHT_GENERIC_LIGHT_")` |
| `AO_SAMPLES` | `64` |
| `AO_MIN` | `0.62`，AO 最暗下限，防止压黑 |
| `AO_STRENGTH` | `0.38` |
| Bake target | `VERTEX_COLORS` |
| Bake margin | `2` |
| Remap 公式 | `ao = max(AO_MIN, 1.0 - AO_STRENGTH * (1.0 - raw))` |
| GLB export | `export_vertex_color="ACTIVE"`、`export_vertex_color_name="Color"` |

适用场景：快速、文件体积小、无贴图依赖；缺点是 AO 精度受 mesh 顶点密度限制，墙角/楼梯根部如果几何点少，效果会不明显。

| Object / Mesh 命名前缀 | 材质 | 网页端意图 |
|---|---|---|
| `ARCH_*`、`STRUCT_WALL_*`、`STRUCT_CEILING_*` | `mat_arch_plaster_warm_white` | 中性银白墙/顶，磨砂轻金属涂层：base `(0.92, 0.92, 0.92, 1)`, metallic `0.08`, roughness `0.72` |
| `ARCH_FLOOR_*`、`STRUCT_FLOOR_*` | `mat_floor_concrete_warm_gray` | 中性深灰磨砂地面，弱反射：base `(0.37, 0.37, 0.37, 1)`, metallic `0.06`, roughness `0.76` |
| `STRUCT_STAIR_*` | `mat_stair_warm_concrete` | 楼梯与地面同色同反射：base `(0.37, 0.37, 0.37, 1)`, metallic `0.06`, roughness `0.76` |
| `METAL_ALUMINUM_*` | `mat_metal_aluminum_soft` | 银白阳极氧化铝/格栅：base `(0.90, 0.90, 0.90, 1)`, metallic `0.74`, roughness `0.18` |
| `GLASS_FROSTED_*`、其他 `GLASS_*` | `mat_glass_frosted_soft` | 磨砂灰蓝透明玻璃，反射更强：base `(0.74, 0.76, 0.76, 0.42)`, roughness `0.42`, alpha blend |
| `GLASS_CLEAR_*` | `mat_glass_clear_soft` | 更清透、更强反射玻璃：base `(0.84, 0.86, 0.86, 0.32)`, roughness `0.14`, alpha blend |
| `LIGHT_GENERIC_LIGHT_*` | `mat_led_generic_warm_emissive` | 暖白 LED 发光面：base `(1.0, 0.94, 0.78, 1)`, emissive `(1.0, 0.90, 0.66)`, strength `2.8` |
| `COL_*` | `mat_collision_helper_transparent_red` | 碰撞辅助材质；运行时由 `prepareGalleryScene` 隐藏 |

> WebGPU 材质支持备注：Three.js `WebGPURenderer` 对 `MeshStandardMaterial` 的 base color、metallic、roughness、emissive、alpha blend 支持稳定，适合作为 `space_main` 主通路。透明玻璃的“反射”主要来自低 roughness 对灯光/环境的高光响应；如果未来要镜面级反射，需要单独引入环境贴图、反射探针或屏幕空间反射方案，而不应只依赖 glTF 透明材质扩展。

---

## 2. 前缀速查表

| **`COL_`** | **碰撞体（简化几何）** | **Rapier trimesh** | **否（自动隐藏）** |
| **`exhibit_`** | **可交互展品 hit mesh** | **射线 + manifest** | 是 |
| **`bulb_`** | **灯泡 emissive + 点光源锚点** | **PointLight** | 是 |
| `struct_` | 建筑结构（墙地顶、柱、梁、台阶） | 阴影 | 是 |
| `trim_` | 收边、踢脚线、门框、窗框 | 阴影 | 是 |
| `prop_` | 固定装饰（不可交互） | 阴影 | 是 |
| `glass_` | 玻璃（透明/半透明） | 待实现 | 是 |
| `dec_` | 纯装饰（画框外框、标牌、植物） | 阴影 | 是 |
| `art_` | 墙上平面画芯占位（可选） | 待实现 | 是 |
| `lgt_` | 仅灯具几何（不发光锚点） | — | 是 |
| `fx_` | 粒子/光晕占位（未来） | 待实现 | 可选 |
| **`FOOT_`** | **地面脚步声区域** | **待实现** | 否或半透明 |
| `zone_` | 主题分区触发体积（未来 BGM） | 待实现 | 否 |
| `spawn_` | 玩家/相机出生点标记 | **`spawn_player_main` → resolveGallerySpawn** | 否 |
| `nav_` | 导航/阻挡辅助（仅编辑器） | 不导出 | 否 |

> **注意**：运行时前缀大小写敏感——碰撞必须是 **`COL_`（大写）**；展品 **`exhibit_`**、灯泡 **`bulb_`** 为小写。

> **已实现**（2026-05）：`COL_`、`exhibit_`、`bulb_`  
> **文档预留**：`glass_`、`FOOT_`、`zone_`、`art_`

---

## 3. 建筑结构 `struct_`

描述展厅本体，**不参与交互**。

### 3.1 方位词

| 词 | 含义 |
|----|------|
| `north` / `south` / `east` / `west` | 相对展厅原点的前/后/左/右（建议：`-Z` 为 north） |
| `center` | 中央 |
| `inner` / `outer` | 内外双层墙 |

### 3.2 推荐命名

| Mesh 名 | 说明 |
|---------|------|
| `struct_floor_main` | 主地面 |
| `struct_floor_01` | 分区地面 |
| `struct_wall_north` | 北墙 |
| `struct_wall_south` | 南墙 |
| `struct_wall_east` | 东墙 |
| `struct_wall_west` | 西墙 |
| `struct_wall_north_window` | 带窗洞的北墙（若与墙分 mesh） |
| `struct_roof_main` | 屋顶 |
| `struct_ceiling_main` | 平顶天花（与 roof 二选一或分层） |
| `struct_column_01` | 柱 |
| `struct_stair_main` | 楼梯 |
| `struct_railing_01` | 栏杆 |

### 3.3 材质示例（Material 名）

```
mat_floor_concrete_gray
mat_wall_plaster_white
mat_roof_metal_dark
mat_wood_oak_light
```

---

## 4. 碰撞体 `COL_`

**必须与视觉分离或简化**；导出前 Apply Scale。

| 规则 | 说明 |
|------|------|
| 前缀 | **`COL_`（大写 C-O-L，代码严格匹配）** |
| 几何 | Box / 简化 mesh，面数尽量低 |
| 可见性 | Blender 中可隐藏；运行时 [`prepareGalleryScene`](../apps/web/src/scenes/gallery/prepareGalleryScene.ts) 会 `visible = false` |
| 1:1 映射 | 建议与结构对应：`struct_wall_north` → `COL_wall_north` |

### 4.1 推荐命名

| Mesh 名 | 说明 |
|---------|------|
| `COL_floor_main` / `COL_floor_001` | 地板碰撞（当前 `space_main.glb` 使用 `COL_floor_*`） |
| `COL_wall_north` | 北墙碰撞 |
| `COL_wall_south` | 南墙碰撞 |
| `COL_wall_east` | 东墙碰撞 |
| `COL_wall_west` | 西墙碰撞 |
| `COL_roof_main` | 屋顶碰撞（低矮空间需要） |
| `COL_stair_main` | 楼梯碰撞 |
| `COL_railing_01` | 栏杆碰撞 |
| `COL_exhibit_pedestal_01` | 展品底座碰撞（非交互，仅阻挡） |

### 4.2 不要碰撞的物体

- 细小装饰 `dec_*`、画框 `art_*`
- 玻璃 `glass_*`（通常 walk-through 或单独 thin collider）
- 展品 **交互 mesh** `exhibit_*`：视觉可碰撞用单独 `COL_exhibit_*` 若需要

---

## 5. 收边与道具 `trim_` / `prop_` / `dec_`

| 前缀 | 用途 | 示例 |
|------|------|------|
| `trim_` | 建筑细部 | `trim_baseboard_north`、`trim_door_frame_01` |
| `prop_` | 场景道具 | `prop_bench_01`、`prop_plant_monstera_01` |
| `dec_` | 装饰 | `dec_sign_exit`、`dec_frame_empty_01` |

---

## 6. 展品 `exhibit_`

### 6.1 交互根 mesh（必须）

**命名**：`exhibit_<exhibitId>`

- `<exhibitId>` 与 [`public/exhibits/manifest.json`](../apps/web/public/exhibits/manifest.json) 的 `exhibitId` 一致
- 运行时：`exhibit_demo_box` → `userData.exhibitId = "demo_box"`
- **射线检测只认带 `userData.exhibitId` 的 mesh**

| Mesh 名 | manifest exhibitId |
|---------|-------------------|
| `exhibit_demo_box` | `demo_box` |
| `exhibit_band_tv` | `band_tv` |
| `exhibit_arch_model_01` | `arch_model_01` |

### 6.2 展品子 mesh（不单独交互）

命名：`exhibit_<exhibitId>_<part>`

| Mesh 名 | 说明 |
|---------|------|
| `exhibit_demo_box_body` | 盒体视觉 |
| `exhibit_demo_box_lid` | 盒盖（示例） |
| `exhibit_band_tv_screen` | 屏幕（未来 video 贴图） |
| `exhibit_band_tv_frame` | 电视框 |
| `exhibit_band_tv_btn_power` | 屏幕上的 power 按钮（未来 glb 内按钮） |

**规则**：

- 子 mesh **不要** 等于 `exhibit_<id>` 纯 id 格式，避免误绑定
- 若希望「点到任意部件都算点到展品」：子 mesh 不设 exhibitId，射线打父级 **一个** 简化 hit mesh（推荐单独 `exhibit_<id>_hit` 透明 box）

### 6.3 推荐 hit 策略（行业常见）

```
Empty: exhibit_demo_box_grp
├── exhibit_demo_box          ← 交互 hit（简单 box）
├── exhibit_demo_box_body     ← 视觉
└── COL_exhibit_demo_box      ← 可选物理阻挡
```

Focus 特写模型在 **独立文件** `public/exhibits/<id>/focus_<id>.glb`（例：`demo_box/focus_demo_box.glb`），不在 `space_main.glb` 内。

### 6.4 展品 Material 名

```
mat_exhibit_demo_box_body
mat_neutral_gray_light
mat_exhibit_band_tv_screen_emissive
```

---

## 7. 灯光 `bulb_` / `lgt_`

### 7.1 发光灯泡（已实现）

| Mesh 名 | 说明 |
|---------|------|
| `bulb_01` | 吊灯灯泡 1 |
| `bulb_window_spot_01` | 窗侧补光泡 |
| `bulb_gallery_track_02` | 轨道灯 2 |

- 材质：**Emissive**（暖白 `#ffd9a3` 一类）
- 运行时：在 mesh 位置自动创建 **PointLight** + Bloom

### 7.2 灯具几何（不发光）

| Mesh 名 | 说明 |
|---------|------|
| `lgt_pendant_01` | 吊灯罩 |
| `lgt_track_rail_north` | 轨道 |
| `lgt_switch_01` | 开关（纯装饰） |

---

## 8. 玻璃 `glass_`

| Mesh 名 | 说明 |
|---------|------|
| `glass_window_north_01` | 北窗玻璃 |
| `glass_door_entrance` | 入口玻璃门 |
| `glass_railing_01` | 玻璃栏板 |

**建模建议**：

- 单独 mesh，单面或薄盒
- Material：`mat_glass_clear` / `mat_glass_frosted`
- 透明度、IOR、双面渲染在 glTF 材质中配置
- 碰撞：通常 **无**；或单独 `COL_glass_door` 薄 box

**运行时**：待实现透明排序与反射策略；命名先预留。

---

## 9. 挂画 `art_`

两种方案（二选一）：

| 方案 | 命名 | 说明 |
|------|------|------|
| A. 代码画框（当前） | 无需 mesh | 见 `galleryConfig.ts` 的 `GALLERY_WALL_ART` |
| B. glb 内框 + 代码贴图 | `art_frame_01` + `art_canvas_01` | 框在 glb，画芯 UV 或运行时换贴图 |

推荐命名：

| Mesh 名 | 说明 |
|---------|------|
| `art_frame_01` | 画框外框 |
| `art_canvas_01` | 画芯平面（UV 朝外） |
| `dec_frame_molding_01` | 纯装饰框线 |

---

## 10. 地面脚步声 `FOOT_`

**文档约定，代码待实现。**

| Mesh 名 | 材质 | 脚步样本 |
|---------|------|----------|
| `FOOT_wood` | 木地板区域 | wood |
| `FOOT_concrete` | 水泥 | concrete |
| `FOOT_carpet` | 地毯 | carpet |
| `FOOT_tile` | 地砖 | tile |

- 应为 **薄 box**，略高于地面，Blender 中隐藏
- 可与 `struct_floor_*` 分区对应：`FOOT_wood_gallery_a`

---

## 11. 分区 `zone_`（未来 BGM / 环境）

| Mesh 名 | 对应 zone slug |
|---------|----------------|
| `zone_architecture` | architecture |
| `zone_ai` | ai |
| `zone_photography` | photography |
| `zone_anime` | anime |
| `zone_band` | band |

- 使用 **Box 体积**，不导出可见 mesh，或 `visible=false`
- 玩家进入体积 → `AudioDirector.setZone()`

---

## 12. 辅助 `spawn_` / `nav_`

| Mesh 名 | 说明 |
|---------|------|
| `spawn_player_main` | 默认出生点（Empty 或单点） |
| `spawn_player_alt_01` | 备用出生 |
| `nav_blocker_debug` | 仅 DCC，**不导出到 glb** |

运行时读取 [`resolveGallerySpawn.ts`](../apps/web/src/scenes/gallery/resolveGallerySpawn.ts)：`spawn_player_main` 的世界 XZ + 脚下 `COL_ground`/`COL_platform_*` 顶面算 Y；失败则网格采样 fallback。`galleryConfig.ts` 的 `GALLERY_SPAWN` 仅为加载前占位。

当前 glb 节点 ↔ 代码对照见 [`assets/exhibit-asset-tracker-gallery_nodes.csv`](assets/exhibit-asset-tracker-gallery_nodes.csv)。

---

## 13. 完整示例：当前生产空间（2026-06-14）

```
space_main.glb
├── struct_floor_001~012
├── struct_wall_001~013
├── struct_stair_001~013
├── struct_ceiling_001~010
├── struct_arch_001~002
├── lgt_panel_001~002
├── bulb_001~002
├── COL_floor_001~012
├── COL_wall_001~013
├── COL_stair_001~013
└── spawn_player_main          ← Empty 出生点
```

当前 `space_main.glb` 暂未放置 `exhibit_*` hit mesh；展品 Focus 特写仍放在 `public/exhibits/<id>/focus_<id>.glb`。

---

## 14. Blender 导出 Checklist

- [ ] Scene Unit：1 unit = 1 m
- [ ] 原点：地板中心；玩家眼高约 `y = 1.6`
- [ ] 所有导出 Mesh **Apply Scale / Rotation**
- [ ] Mesh 名符合本规范，无 `Cube.001`
- [ ] Material 名符合 `mat_*` 约定
- [ ] `COL_*` 已简化；`exhibit_*` hit mesh 明确
- [ ] 玻璃、发光材质已设 Emissive / Alpha
- [ ] 导出 glTF Binary (`.glb`)，仅选必要 Collection
- [ ] 放入 `apps/web/public/models/space_main.glb`

---

## 15. 与 manifest / CMS 对照

| glb mesh | manifest `exhibitId` | CMS `sceneObjectName` | focus 文件 |
|----------|----------------------|------------------------|------------|
| `exhibit_demo_box` | `demo_box` | `exhibit_demo_box` | `/exhibits/demo_box/focus_demo_box.glb` |
| `exhibit_band_tv` | `band_tv` | `exhibit_band_tv` | `/exhibits/band_tv/focus_band_tv.glb` |

**三者必须一致**（mesh 名 = sceneObjectName；exhibitId = mesh 去掉 `exhibit_` 前缀）。

---

## 16. 反模式（避免）

| 错误 | 原因 |
|------|------|
| `Cube.001`、`Mesh.002` | 无法绑定、无法协作 |
| `exhibit-demo-bass` | 含连字符，与 manifest 不一致 |
| 碰撞与视觉同一 mesh 且高面数 | Rapier 性能差 |
| 多个 mesh 都叫 `exhibit_demo_box` | 违反唯一性 |
| 子部件命名成纯 `exhibit_<id>` 重复 | 误触发交互 |
| 在 mesh 名写 `mat_red` 代替 Material | 难以维护，违反 DCC 惯例 |

---

## 17. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-06-23 | 增补 `space_main` 银白轻金属材质恢复规则、Blender 脚本入口、对象前缀映射、vertex AO 参数与 Windows 接续命令 |
| 2026-05-28 | 初版：对齐 `COL_` / `exhibit_` / `bulb_` 实现，预留 glass / FOOT_ / zone |
