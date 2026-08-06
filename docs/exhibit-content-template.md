# Exhibit 内容模板:一个项目需要哪些内容

> 适用范围:LizzardKevin SPACE 的所有展品/项目内容,不只是建筑——音乐、游戏、影像、摄影/平面共用同一套管线。
> 目的:让你手动新增或调整一个项目时,知道要填哪些内容、填在哪里、怎么确认填对了。

---

## 0. 先记住这张图(数据流)

```
docs/assets/space-exhibit-index.xlsx        ← 唯一权威源,你只改这里
        │
        │  node scripts/generate-space-content.mjs        (重新生成)
        │  npm run content:check                          (只校验,不写)
        ▼
生成物(不要手改,手改会被下次生成覆盖):
  apps/web/public/exhibits/manifest.json        展厅清单(类型/媒体/摆放)
  apps/web/public/exhibits/<id>/content.json    详情页文案(双语)
  apps/web/src/generated/*.generated.ts         移动端/Profile/DevStories/i18n 数据
        ▼
页面消费点:
  展厅 hover 底部提示(title+subtitle) / Focus 详情页 / 移动端条目 / Profile / DevStories
```

**铁律:手改 xlsx,不手改生成物。** 改完 xlsx 必须重新生成并通过 `content:check`,否则站点看不到变更。

---

## 1. entry_kind 速查:xlsx 一行可以是什么

| entry_kind | 是什么 | 出现在 |
|---|---|---|
| `exhibit` | 完整展品:3D 展厅里有实体,有详情页 | 展厅 + 详情页 + 移动端 |
| `project` | 轻量项目位:无 3D 实体,占位/预告性质 | 移动端/索引 |
| `profile_section` | Profile 页的一个分区(如 Education / Music / Band) | Profile |
| `profile_identity` / `profile_link` | Profile 身份信息 / 链接 | Profile |
| `skill` | 技能条目 | Profile |
| `dev_story` | 开发日志 | DevStories |
| `ui_copy` | 界面文案(i18n) | 全站 |
| `asset_note` / `gallery_node` | 资产台账 / 展厅结构注释 | 不直接渲染,备查 |

一个"项目"要成为展厅里能走进去看到的展品,用 `exhibit`;只想先在索引里占位,用 `project`,后续升级为 `exhibit`。

---

## 2. 一个 Exhibit 的完整构成(四件套)

| # | 构成 | 在哪里 | 谁产出 |
|---|---|---|---|
| A | **文案**(双语) | xlsx 行 → `public/exhibits/<id>/content.json` | 你手写,脚本搬运 |
| B | **资产文件** | `apps/web/public/exhibits/<id>/` 下的 GLB / img / video,或 `public/media/<id>.mp3|mp4` | 你准备,管线优化 |
| C | **场景摆放** | xlsx `scene_*` 列 → manifest `scene` | 摆放管线产出坐标后回填,不凭空手填 |
| D | **移动端呈现** | xlsx `mobile_*` 列 → generated | 你手写 |

少任何一件,展品都会"缺一角":A 缺→生成直接报错(硬必填);B 缺→展厅/详情页无媒体;C 缺→展厅里不存在;D 缺→生成报错(移动端硬必填)。

---

## 3. 通用字段骨架(所有学科共用)

xlsx 列按 `en`/`zh` 成对出现。下面按**生成脚本的硬性程度**分三层——"硬必填"是指缺了 `generate-space-content.mjs` 直接报错退出,不是建议。

### 3.1 硬必填(脚本 fail,内容进不了站)

| 列 | 说明 |
|---|---|
| `entry_kind` / `id` / `enabled` / `order` | `exhibit`;id 用 `学科_短名` 小写蛇形(如 `arch_treehabitat`、`music_xxx`);`enabled=Y` |
| `title_en` / `title_zh` | 正式标题,双语。hover 提示、详情页 hero 都用它 |
| `subtitle_en` / `subtitle_zh` | 一句话副标题,双语。hover 提示第二行、hero 副标题 |
| `overview_en` / `overview_zh` | 一段话说清这是什么,双语(详情页 01 节) |
| `story_en` / `story_zh` | 完整叙述,双语,**HTML 格式**(用 `<p>` 分段;详情页 STY 节原样渲染) |
| `tags_en` / `tags_zh` | 标签,双语且都非空,**每行一个**(单元格内换行分隔) |
| `focus_glb_url` | Focus 模式模型:`/exhibits/<id>/focus_<id>.glb` |
| `manifest_type` | 枚举:`model3d` `image` `audio` `video`,见 §4 分学科选择 |

### 3.2 移动端硬必填(exhibit 会进移动端项目列表,同样 fail)

| 列 | 说明 |
|---|---|
| `mobile_index_label` | 移动端索引里的条目名 |
| `mobile_summary_en/zh` `mobile_signal_en/zh` | 移动端摘要/定位说明,双语 |
| `mobile_space_layer_en/zh` `mobile_archive_note_en/zh` | 空间分层说明/归档备注,双语 |
| `mobile_media_status_en/zh` | 媒体状态说明,双语(如"图片序列 / 手机端不展示 3D") |
| `mobile_category` | 枚举:`Study` `Architecture` `Music` `Culture` `Experiment` |
| `mobile_stage_id` | 枚举:`stage-student` `stage-work` `stage-music` `stage-culture` `stage-explore` |
| `mobile_stage_label` | stage 显示名(如 Education) |
| `mobile_media_kind` | 枚举:`image` `audio` `video` `model` `text` |

### 3.3 选填(有则显示,缺则跳过,不报错)

| 列 | 说明 |
|---|---|
| `short_title_en/zh` | 短标题;缺省回退 `title` |
| `mobile_subtitle_en/zh` | 移动端副标题;缺省回退 `subtitle` |
| `mobile_story_en/zh` | 移动端长文 |
| `year` `type_en/zh` `medium_en/zh` `role_en/zh` `status_en/zh` `authors` `credits_en/zh` `notes_en/zh` | metadata 八行,见 §5;填几行显示几行 |
| `image_urls` | 图片序列,**每行一个路径** |
| `video_url` / `audio_url` | 视频/音频路径;audio 类型缺省时按约定取 `/media/<id>.mp3` |
| `buttons_json` | 交互按钮定义(JSON),音视频类用 |

### 3.4 展厅显形(脚本不强制,但缺了展品在 3D 展厅里不存在)

| 列 | 说明 |
|---|---|
| `scene_model_url` | 展厅内模型:`/exhibits/<id>/space_<id>.glb`;**填了它就必须给坐标** |
| `scene_distance_center` | 摆放中心坐标 `x, y, z`(如 `-12.59, 26.42, -5.63`),**摆放管线产出后回填** |
| `scene_scale` `scene_snap` `scene_height_offset` `scene_yaw_offset_deg` `scene_unload_distance` | 缩放/吸附(`floor`/`none`,缺省 `none`)/高度/朝向/卸载距离(缺省 60) |

---

## 4. 分学科模板

### 4.1 建筑 / 空间设计(现有三个展品的形态)

- `manifest_type` = `model3d`;必须同时有 `focus_glb_url` + `scene_model_url` + `image_urls`(图版序列)
- 资产清单:`focus_<id>.glb`(精简展示模型)、`space_<id>.glb`(展厅摆放模型)、`img/*.webp`(图版/渲染/图纸)
- metadata 建议:Year / Type(student work·mixed use…) / Medium(图纸、数字模型、图像序列) / Role(概念、设计、建模、表达) / Status(学生作品集展品)
- 参考行:`education` 表的 `arch_treehabitat`(字段最全的范本)

### 4.2 音乐 / 乐队

- `manifest_type` = `audio`;`audio_url` 可留空 → 约定路径 `apps/web/public/media/<id>.mp3`
- 资产清单:音频文件(mp3);封面/现场照片走 `image_urls`;MV 或现场视频走 `video_url`(可选)
- `mobile_category` = `Music`,`mobile_stage_id` = `stage-music`,`mobile_media_kind` = `audio`
- metadata 建议:Year / Type(单曲·EP·专辑·现场) / Medium(编制与录制方式) / Role(作曲·编曲·演奏·混音中你负责的) / Status(发行状态);可加 `credits_en/zh`(乐手/制作名单)
- 叙事建议(storyHtml):创作背景 → 编排/声音设计 → 录制过程 → 与作品集里其他项目的关系

### 4.3 游戏 / 交互作品

- `manifest_type` 按主证据选:有 3D 场景模型用 `model3d`;只有预告/实况用 `video`;只有截图序列用 `image`
- 资产清单:预告片 `video_url`(或 `public/media/<id>.mp4`)、截图 `image_urls`;可玩构建当前不外链在 manifest,下载/游玩链接写进 `credits` 或 storyHtml
- `mobile_category` = `Experiment`(或按主题),`mobile_media_kind` = `video`/`model`
- metadata 建议:Year / Type(游戏 jam·原型·正式发行) / Medium(引擎+平台,如 Unity·Web) / Role(策划·程序·美术分工) / Status(原型·已发布);团队信息进 `credits_en/zh`
- 叙事建议:设计命题 → 核心机制 → 迭代与试玩反馈 → 技术要点(可链接 DevStories 条目)

### 4.4 影像 / 动画

- `manifest_type` = `video`;`video_url` 指向 mp4(现有范例:`arch_3d_printing_architecture/video/final-clip-without-bgm.mp4`)
- 资产清单:成片 mp4;静帧/分镜走 `image_urls`(可选)
- `mobile_media_kind` = `video`
- metadata 建议:Year / Type(动画·实拍·混合) / Medium(时长+制作工具) / Role(导演·动画·剪辑分工) / Status

### 4.5 摄影 / 平面 / 插画

- `manifest_type` = `image`;`image_urls` 是唯一媒体,每行一个 webp 路径
- 资产清单:`img/*.webp`(控制在合理体积,序列有明确观看顺序)
- `mobile_category` = `Culture`(或按主题),`mobile_media_kind` = `image`
- metadata 建议:Year / Type(系列·单幅) / Medium(器材/工艺) / Role / Status

---

## 5. metadata 八行约定(详情页底部表格)

系统原生支持八行,填几行显示几行;建议至少填齐前五行,保持跨项目可比:

| 列 | label(en/zh) | 写什么 |
|---|---|---|
| `year` | Year / 年份 | 完成年份 |
| `type_en/zh` | Type / 类型 | 学科+子类(学生作品 / 复合功能高层) |
| `medium_en/zh` | Medium / 媒介 | 交付物形态(图纸、模型、音频、可玩原型…) |
| `role_en/zh` | Role / 角色 | 你在其中的职责 |
| `status_en/zh` | Status / 状态 | 当前状态(学生作品集展品 / 已发行 / 原型) |
| `authors` | Authors / 作者 | 作者名单(**不分语言,单列**) |
| `credits_en/zh` | Credits / 鸣谢 | 协作/制作名单,双语 |
| `notes_en/zh` | Notes / 备注 | 补充说明,双语 |

学科扩展信息(音乐的 BPM/调性/时长,游戏的引擎/平台/开发周期)优先写进 `notes_en/zh` 或 storyHtml;只有某类信息在多件作品间反复出现时,才考虑固定进 `type`/`medium` 的写法,保持八行结构不变。

---

## 6. 改完之后:手工核对清单

按顺序执行,任何一步红了就停下来修:

1. **xlsx 保存**:`docs/assets/space-exhibit-index.xlsx`,确认 `enabled=Y`、id 无重复、枚举列没写出枚举外取值(§3 各表)
2. **资产就位**:
   - `apps/web/public/exhibits/<id>/` 下的 GLB/img/video 与 xlsx 里的路径**逐字符一致**
   - 音视频若用约定路径,确认 `apps/web/public/media/<id>.mp3|.mp4` 存在
3. **重新生成**:`node scripts/generate-space-content.mjs`
4. **校验同步**:`npm run content:check`(应无 diff 输出;有 diff 说明生成物与 xlsx 不同步)
5. **全量验证**:`npm run verify:quick`
6. **目检**(vite dev 下):
   - 展厅:走到展品旁 → hover 底部提示显示 title/subtitle(本轮新功能,顺手验)
   - 详情页:hero 标题/副标题 → 01 Overview+tags → 媒体节(图/视/音) → STY 叙事 → 底部 metadata 表格
   - 移动端:索引条目、摘要、媒体状态说明
   - 语言切换:中英都过一遍;双语硬必填有脚本兜底,这里主要看选填字段(short_title/mobile_subtitle)的回退和文案质感

---

## 7. 常见坑

- **手改 `content.json` / `manifest.json`**:下次跑生成脚本就被覆盖,改 xlsx 才是正道。
- **tags / image_urls 用逗号分隔**:它们是**换行分隔**,逗号会被当成一个标签/一条坏路径。
- **story 写纯文本**:storyHtml 走 HTML 渲染,段落必须用 `<p>` 包,否则挤成一坨。
- **凭空手填 `scene_distance_center`**:坐标由展厅摆放管线产出(参考 `docs/exhibit-anchor-lod-pipeline.md`),手填的坐标多半穿模或悬空。
- **只填英文就跑去生成**:exhibit 的 title/subtitle/overview/story/tags 和移动端摘要类字段**双语缺一会直接报错**,生成失败;报错信息会指明哪行哪列,照着补即可。
- **id 起名不带学科前缀**:`arch_` `music_` `game_` 前缀让路径、媒体约定和检索都顺。

---

## 8. 新展品最小起步(复制这个流程)

1. 定 id(学科前缀+短名),在合适的 sheet(`education` / `professional_practice` / `personal_archive` / `explore`)加一行 `entry_kind=project` 占位,填 `title_en/zh` + §3.2(project 也进移动端列表,移动端硬必填照跑)+ 按需 §3.3
2. 准备资产进 `apps/web/public/exhibits/<id>/`(或 `public/media/`)
3. 升级 `entry_kind=exhibit`,补齐 §3.1 硬必填 + §3.4 展厅显形;场景摆放走摆放管线拿坐标回填
4. 跑 §6 清单
