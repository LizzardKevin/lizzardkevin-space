# 空间音频资源

进入 SPACE（architecture 区）后会播放很轻的环境循环。行走时按步频播放脚步声。

## 环境 / 脚步（非展品）

| 文件 | 用途 |
|------|------|
| `ambient_architecture.mp3` | 环境底噪（音量约 11%；WAV 亦可，改 `audioConfig.ts` 路径） |
| `footstep_01.wav` ~ `footstep_03.wav` | 室内脚步声（柔和、偏小） |

占位生成：`node apps/web/scripts/generate-placeholder-audio.mjs`（仅生成 `audio/` 下文件）。

## 展品音乐 / 视频

见 [`../media/README.md`](../media/README.md)：按 **exhibitId** 放在 `public/media/`，例如 `demo_box.mp3`。
