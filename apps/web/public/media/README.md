# 展品媒资（`exhibitId` 命名）

| 类型 | 磁盘路径 | 示例 |
|------|----------|------|
| 音频 | `public/media/<exhibitId>.mp3` | `demo_box.mp3` |
| 视频 | `public/media/<exhibitId>.mp4` | `band_tv.mp4` |

`manifest.json` 里 `type` 为 `audio` 或 `video` 时，默认使用 `/media/<exhibitId>.mp3` 或 `.mp4`，无需在 JSON 里重复写 URL。

非标准路径时在 manifest 中显式配置 `media.audioUrl` / `media.videoUrl`。
