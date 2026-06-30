# space_main Rhino 重导入 Runbook

这份文档描述的是一套可重复执行的 Blender 资产处理流程。目标很简单：

1. 每次 Rhino 模型更新后，把新 GLB 手动替换进 `BlenderFile/space_main.blend`。
2. 用 Blender Python 重新恢复材质、collection 分组、出生点和朝向约定。
3. 重新导出 `apps/web/public/models/space_main.glb`，再更新网页端 revision。

这份 runbook 是按当前 `space_main.blend`、`scripts/apply-space-main-materials.py`、`scripts/bake-space-main-ao.py`、`apps/web/src/scenes/gallery/resolveGallerySpawn.ts` 和 `apps/web/src/scenes/gallery/galleryConfig.ts` 复原出来的。

## 当前固定约定

### 1. 材质恢复

材质恢复逻辑已经固化在 [`scripts/apply-space-main-materials.py`](../scripts/apply-space-main-materials.py)。

它会按对象名前缀重新赋材质，核心映射是：

| 前缀 | 材质 |
|---|---|
| `COL_*` | `mat_collision_helper_transparent_red` |
| `LIGHT_GENERIC_LIGHT_*` | `mat_led_generic_warm_emissive` |
| `ARCH_STAIR_*`、`STRUCT_STAIR_*` | `mat_stair_warm_concrete` |
| `ARCH_FLOOR_*`、`STRUCT_FLOOR_*` | `mat_floor_concrete_warm_gray` |
| `METAL_ALUMINUM_*` | `mat_metal_aluminum_soft` |
| `GLASS_CLEAR_*` | `mat_glass_clear_soft` |
| `GLASS_FROSTED_*`、其他 `GLASS_*` | `mat_glass_frosted_soft` |
| `TEMP_BLOCKER_*` | `mat_temp_blocker_frosted_milky` |
| `ARCH_*`、`STRUCT_WALL_*`、`STRUCT_CEILING_*` | `mat_arch_plaster_warm_white` |

它的导出目标始终是 `apps/web/public/models/space_main.glb`。

`TEMP_BLOCKER_*` 的 Blender/GLB 材质只是基础 fallback。网页运行时会在 `prepareGalleryScene` 中把这些 mesh 替换为 `runtime_temp_blocker_frosted_physical`，使用 `MeshPhysicalMaterial` 的 transmission、thickness、attenuation 和高 roughness 来做真正的磨砂遮挡效果。

### 2. Collection 分组

当前 Blender 源文件里使用的是这组稳定 collection 名称：

| Collection | 用途 |
|---|---|
| `COLLISION_HELPERS` | 所有 `COL_*` 碰撞对象，包括地面、墙、楼梯等碰撞网格 |
| `MARKERS` | `spawn_player_main` 以及其他标记 Empty |
| `VIS_ARCHITECTURE` | `ARCH_*` 视觉结构，不含 `ARCH_STAIR_*` |
| `VIS_FLOORS` | `ARCH_FLOOR_*`、`STRUCT_FLOOR_*` |
| `VIS_GLASS` | `GLASS_*` |
| `VIS_LIGHTING` | `LIGHT_GENERIC_LIGHT_*` |
| `VIS_METAL_PROPS` | `METAL_ALUMINUM_*` |
| `VIS_STAIRS` | `ARCH_STAIR_*`、`STRUCT_STAIR_*` |
| `VIS_TEMP_BLOCKERS` | `TEMP_BLOCKER_*` temporary frosted view blockers |

如果 Rhino 重导入后生成了临时 import collection，原则很简单：

1. 物体按前缀放回上面这些稳定 collection。
2. 临时 collection 可以删掉。
3. 不要把新的命名体系散落到多个随机 collection 里。

### 3. 出生点

出生点对象名固定为 `spawn_player_main`。

要求：

| 项 | 约定 |
|---|---|
| 类型 | `Empty` 或等价的非渲染标记 |
| 名字 | `spawn_player_main` |
| 旋转 | 保持 `0, 0, 0` |
| 位置 | 只按设计好的世界 X / Z 位置放置；Y 由运行时根据地面碰撞计算 |
| 方向 | 不靠 marker 旋转编码方向，方向由 runtime 常量控制 |

运行时代码会读取 `spawn_player_main` 的世界坐标，然后：

1. 找脚下 `COL_floor_*` / `COL_ground*` / `COL_platform*` 顶面。
2. 用地面顶面加胶囊体脚底偏移，算出最终站立高度。
3. 摄像机再加 `EYE_OFFSET`。

如果 marker 下没有可用地面碰撞，runtime 会退回到 marker 自身高度。

### 4. 朝向

当前桌面版第一视线方向是固定的：

- `apps/web/src/scenes/gallery/galleryConfig.ts`
- `GALLERY_INITIAL_LOOK_DIRECTION = [0, 0, 1]`

这表示 runtime 里朝 `+Z` 方向看，而它在 Blender 约定里对应的是全局 `-Y`。

因此，Blender 里给 spawn 的语义是：

1. marker 放在正确的起始位置。
2. marker 本身不旋转。
3. “朝前”的定义写进流程，不要靠手工转 Empty 解决。

如果以后你真的要改出生朝向，要改的是代码常量，不是 Blender 里把 Empty 乱旋转。

## 每次 Rhino 更新后的处理顺序

### A. 替换模型

1. 从 Rhino 重新导出新的 GLB。
2. 在 Blender 里把新导出的模型替换进 `BlenderFile/space_main.blend`。
3. 保留对象名稳定，尤其是 `COL_*`、`ARCH_*`、`STRUCT_*`、`GLASS_*`、`LIGHT_GENERIC_LIGHT_*`、`METAL_ALUMINUM_*`、`spawn_player_main`。

### B. 恢复 collection

把对象按前缀归回稳定 collection。当前目标是上面那 8 个 collection。

如果你在 Blender GUI 里手动做，核心原则就是：

1. 视觉结构进 `VIS_ARCHITECTURE`、`VIS_FLOORS`、`VIS_GLASS`、`VIS_LIGHTING`、`VIS_METAL_PROPS`、`VIS_STAIRS`、`VIS_TEMP_BLOCKERS`。
2. 碰撞进 `COLLISION_HELPERS`。
3. `spawn_player_main` 进 `MARKERS`。

### C. 恢复材质

运行材质脚本，让 Blender 按名字自动把材质重新贴回去。

macOS / Linux：

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  BlenderFile/space_main.blend --python scripts/apply-space-main-materials.py
```

Windows PowerShell：

```powershell
$BLENDER = "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe"
& $BLENDER --background BlenderFile\space_main.blend --python scripts\apply-space-main-materials.py
```

如果你的 Blender 已经在 PATH 里，也可以直接：

```powershell
blender --background BlenderFile\space_main.blend --python scripts\apply-space-main-materials.py
```

### D. 需要的话重烘 AO

当前 `space_main` 生产流程先关闭 vertex AO；`scripts/apply-space-main-materials.py` 会清掉 mesh 上的 vertex color attributes。只有重新确认视觉方向时，才把下面这一步当作实验步骤运行。

```powershell
& $BLENDER --background BlenderFile\space_main.blend --python scripts\bake-space-main-ao.py
```

这个脚本只影响 `ARCH_*`、`ARCH_STAIR_*`、`STRUCT_STAIR_*`、`METAL_ALUMINUM_*` 的 `Color` 顶点色，不会改几何和出生点。

### E. 重新导出 GLB

材质自动化跑完以后，保存 `.blend`，再导出 `apps/web/public/models/space_main.glb`。

如果你是在 Blender GUI 里手动导出，记得保持这些导出约束：

| 项 | 约定 |
|---|---|
| 格式 | `GLB` |
| 材质 | 保留 Blender / glTF 原生材质 |
| 顶点色 | 当前生产 GLB 不带 vertex color / `COLOR_0`；需要重新实验 AO 时才导出 `Color` |
| 灯光 | 不导出 Blender 灯光 |
| 相机 | 不导出 Blender 相机 |
| 动画 | 不导出 |
| 坐标 | `Y-up` 导出 |

### F. bump revision

每次替换了 `space_main.glb`，都要同步 bump：

- [`apps/web/src/scenes/gallery/galleryConfig.ts`](../apps/web/src/scenes/gallery/galleryConfig.ts)
- `GALLERY_GLB_REVISION`

不 bump，浏览器很可能还在吃旧缓存。

## Windows 上怎么直接做

### 1. 打开 Blender

打开 `BlenderFile\space_main.blend`。

### 2. 在 Python Console 里跑脚本

最常用的是直接在 Blender 的 Scripting workspace 里执行：

```python
import bpy
```

然后运行已经放在仓库里的脚本，或者把下面的 collection 规则作为手工检查依据。

### 3. 用命令行批处理

Windows 下最稳的是 PowerShell：

```powershell
$BLENDER = "C:\Program Files\Blender Foundation\Blender 5.1\blender.exe"
& $BLENDER --background BlenderFile\space_main.blend --python scripts\apply-space-main-materials.py
& $BLENDER --background BlenderFile\space_main.blend --python scripts\bake-space-main-ao.py
```

### 4. 如果要做一次快速验证

```powershell
& $BLENDER --background BlenderFile\space_main.blend --python-expr "import bpy; print('spawn', sum(o.name=='spawn_player_main' for o in bpy.data.objects)); print('collections', [c.name for c in bpy.data.collections])"
```

## 这套流程的底线

1. 材质不靠手工点 UI 记忆，靠 `apply-space-main-materials.py`。
2. 结构不靠临时命名，靠稳定 collection 和对象名前缀。
3. 出生点不靠 marker 旋转，靠 `spawn_player_main` + runtime 朝向常量。
4. 重新导出后必须 bump `GALLERY_GLB_REVISION`。
5. Windows 和 macOS 都用同一套脚本和同一套命名。
