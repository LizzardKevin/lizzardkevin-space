# Exhibit Media

| Type | Disk path | Example |
| --- | --- | --- |
| Audio | `public/media/<exhibitId>.mp3` | `work_001.mp3` |
| Video | `public/media/<exhibitId>.mp4` | `band_tv.mp4` |

When `manifest.json` uses `type: "audio"` or `type: "video"`, the runtime default is `/media/<exhibitId>.mp3` or `/media/<exhibitId>.mp4`.

Use explicit `media.audioUrl` or `media.videoUrl` in the manifest for non-standard paths.
