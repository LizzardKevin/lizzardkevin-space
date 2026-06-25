/** 空间环境音与 SFX 资源路径（可替换为同名 .mp3）。 */
export const AUDIO_PATHS = {
  zoneAmbientUrls: {} as Partial<Record<string, string>>,
  zoneBgmUrls: {
    architecture: "/audio/space_background_looped.mp3",
  } as Partial<Record<string, string>>,
  footstepUrls: [
    "/audio/footstep_01.wav",
    "/audio/footstep_02.wav",
    "/audio/footstep_03.wav",
    "/audio/footstep_04.wav",
    "/audio/footstep_05.wav",
  ],
  jumpStartUrl: "/audio/jump_start.wav",
  jumpLandUrl: "/audio/jump_land.wav",
} as const;

export const DEFAULT_VOLUMES = {
  master: 0.9,
  bgm: 0.14,
  /** 很轻的环境底噪 */
  ambient: 0.11,
  /** 脚步声 */
  sfx: 0.32,
  exhibit: 0.72,
} as const;

/** 每步水平位移（米）；行走与跑步共用。 */
export const FOOTSTEP_INTERVAL_WALK = 1.6;
export const FOOTSTEP_INTERVAL_SPRINT = 1.6;

export const JUMP_SFX_GAIN = 1.5;
export const FOOTSTEP_SFX_GAIN = 1.8;

export const SPACE_BGM_FADE_IN_DELAY_MS = 10_000;
export const SPACE_BGM_FADE_IN_MS = 4_000;
