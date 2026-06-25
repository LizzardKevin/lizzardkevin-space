# 空间音频资源

进入 SPACE（architecture 区）后会播放很轻的环境循环。行走时按步频播放脚步声。

## 环境 / 脚步（非展品）

| 文件 | 用途 |
|------|------|
| `space_background_looped.mp3` | SPACE 全局 BGM（由 `npm run audio:remix-space-bgm -- <source.mp3>` 生成；进入 SPACE 10 秒后 fade in；脚本会对 loop 片段首尾做 crossfade） |
| `ambient_architecture.mp3` | 环境底噪（音量约 11%；WAV 亦可，改 `audioConfig.ts` 路径） |
| `footstep_01.wav` ~ `footstep_05.wav` | 室内脚步声（柔和、随机播放，避免连续重复；`04/05` 仅由 `01` 做轻微时间/音量变形生成） |

占位生成：`node apps/web/scripts/generate-placeholder-audio.mjs`（仅生成 `audio/` 下文件）。

## 展品音乐 / 视频

见 [`../media/README.md`](../media/README.md)：按 **exhibitId** 放在 `public/media/`，例如 `demo_box.mp3`。
