/** 空间环境音与 SFX 资源路径（可替换为同名 .mp3）。 */
export const AUDIO_PATHS = {
  zoneAmbientUrls: {
    architecture: "/audio/ambient_architecture.mp3",
  } as Partial<Record<string, string>>,
  /** 留空则 architecture 区不播 BGM，仅环境循环。 */
  zoneBgmUrls: {} as Partial<Record<string, string>>,
  footstepUrls: [
    "/audio/footstep_01.wav",
    "/audio/footstep_02.wav",
    "/audio/footstep_03.wav",
  ],
  jumpStartUrl: "/audio/jump_start.wav",
  jumpLandUrl: "/audio/jump_land.wav",
} as const;

export const DEFAULT_VOLUMES = {
  master: 0.9,
  bgm: 0.5,
  /** 很轻的环境底噪 */
  ambient: 0.11,
  /** 脚步声 */
  sfx: 0.24,
  exhibit: 0.72,
} as const;

/** 每步水平位移（米）；行走与跑步共用。 */
export const FOOTSTEP_INTERVAL_WALK = 0.75;
export const FOOTSTEP_INTERVAL_SPRINT = 0.75;
