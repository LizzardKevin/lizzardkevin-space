# Asset manifest（模型命名与绑定）

你的 `.glb` 资产只需要遵守一个规则：**所有可交互物体的 mesh 名必须唯一且稳定**，并且与 CMS 的 `exhibit.sceneObjectName` 一致。

> **完整主场景命名规范**（墙体、碰撞、灯、玻璃、展品子 mesh、材质等）见 **[gallery-mesh-naming.md](gallery-mesh-naming.md)**。生产展厅空间以 `space_main` 为准；`gallery_main` 仅保留为历史 demo / 测试资产。

## 命名规范（摘要）

- **字符集**：英文小写 + 数字 + 下划线
- **推荐前缀**：`exhibit_`
- **示例**：`exhibit_band_bass`、`exhibit_arch_model_01`
- **运行时绑定**：mesh 名 `exhibit_<id>` 会自动映射为 `userData.exhibitId = "<id>"`（如 `exhibit_demo_box` → `demo_box`）

> **展品内容与资产附录**（Excel）：[`assets/space-exhibit-index.xlsx`](assets/space-exhibit-index.xlsx)。运行时内容由 `scripts/generate-space-content.mjs` 生成；附录行 `asset_note` / `gallery_node` 记录资产备注与节点↔代码绑定。

## 约定前缀（摘要）

- `COL_...`：碰撞体（简化网格，运行时自动隐藏）
- `bulb_...`：灯泡 emissive + 点光源锚点
- `FOOT_...`：地面脚步声区域（待实现）
- 建筑 / 玻璃 / 装饰等：见 [gallery-mesh-naming.md](gallery-mesh-naming.md)

## 最小对照表（建议你维护一份）

| glb mesh name | exhibit slug | 类型 | 说明 |
|---|---|---|---|
| exhibit_demo_box | demo_box | audio | 测试盒 + Focus 音频 |
| exhibit_demo_bass | demo_bass | model3d | 演示贝司 + Focus 特写 |
| exhibit_band_bass | band-bass | model3d | 墙上的贝司 |
| exhibit_band_tv | band-tv | video | 电视屏幕视频 |

## 把模型放到哪里（当前项目路径）

- 主场景源文件：`BlenderFile/space_main.blend`
- 主场景运行时：`apps/web/public/models/space_main.glb`（默认**不**覆盖 Blender 材质；见 `galleryConfig.ts` 中 `ENABLE_GALLERY_OVERRIDE_MATERIALS`）
- 旧 demo：`gallery_main.blend` / `gallery_main.glb` 只用于测试和历史对照，不再作为生产展厅空间入口
- Focus 特写：`apps/web/public/exhibits/<exhibitId>/focus_<exhibitId>.glb`（例：`exhibits/demo_box/focus_demo_box.glb`）
- Focus 文案：`apps/web/public/exhibits/<exhibitId>/content.json`（`title` / `overview` / `storyHtml`，每件展品独立）
- 展品音/视频（按 **exhibitId** 命名，放在 `apps/web/public/media/`）：
  - 音频：`{exhibitId}.mp3`（例：`demo_box.mp3` → 运行时 `/media/demo_box.mp3`）
  - 视频：`{exhibitId}.mp4`
  - `manifest.json` 中 `type: "audio"` / `"video"` 时会自动解析上述路径；仅当文件名或格式不同时才写 `media.audioUrl` / `media.videoUrl` 覆盖
  - 无媒资则可省略 `media` 与 `buttons`
- 其他道具：`apps/web/public/models/*.glb`

## World-coordinate scene exhibits

- `space_main.glb` should no longer carry real exhibit geometry. Keep architecture, `COL_*`, `spawn_player_main`, and required light/zone markers there.
- Each desktop scene exhibit keeps its authored world coordinates and lives in `apps/web/public/exhibits/<exhibitId>/`.
- Source files use `<exhibitId>.source.glb`.
- SPACE runtime models use `space_<exhibitId>.glb` and must stay under 50k triangles.
- Focus models use `focus_<exhibitId>.glb` and must stay under 150k triangles.
- `apps/web/public/exhibits/manifest.json` uses `scene.distanceCenter` for load distance and `scene.modelUrl` for the SPACE model.
- Runtime assigns `userData.exhibitId` to the loaded independent exhibit root and children, so raycast, hover label, and Focus continue to use the existing `exhibitId` contract.
- Full workflow: [`exhibit-anchor-lod-pipeline.md`](exhibit-anchor-lod-pipeline.md).
