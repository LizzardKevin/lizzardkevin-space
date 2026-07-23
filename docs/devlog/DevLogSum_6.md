这轮补了 LizzardKevin 个人页和 DevStories 内容，也把全局自定义 cursor、Alt/ESC pointer lock 释放和回中心动画放进同一套桌面交互里。macOS / Windows Codex 的跨平台流程也定了下来：本机作为事实源时，用 `--force-with-lease` 同步远端。

`space_main` 资产批处理改走 Blender Python Console，修了 `spawn_player_main` 出生点、平视朝 Blender -Y、marker 高度 fallback 和 GLB revision。Blender collections 与材质重新整理后，生成 69 个 `STRUCT_STAIR_*` 可见楼梯，保留 `COL_STAIR_*` 碰撞体，并给 55 个 `LIGHT_GENERIC_LIGHT_*` 换上 emissive LED 材质。最后继续用 lint、TypeScript、build、GLB 节点检查和 Vite 人工 QA 验证。
