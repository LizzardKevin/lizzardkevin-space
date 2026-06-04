/** 空间环境音与 SFX 资源路径（可替换为同名 .mp3）。 */
export const AUDIO_PATHS = {
  zoneAmbientUrls: {
    architecture: "/audio/ambient_architecture.wav",
  } as Partial<Record<string, string>>,
  /** 留空则 architecture 区不播 BGM，仅环境循环。 */
  zoneBgmUrls: {} as Partial<Record<string, string>>,
  footstepUrls: ["/audio/footstep_01.wav", "/audio/footstep_02.wav"],
} as const;

export const DEFAULT_VOLUMES = {
  master: 0.9,
  bgm: 0.5,
  /** 很轻的环境底噪 */
  ambient: 0.11,
  sfx: 0.26,
  exhibit: 0.72,
} as const;

/** 行走一步大约的水平位移（米）。 */
export const FOOTSTEP_INTERVAL_WALK = 0.44;
export const FOOTSTEP_INTERVAL_SPRINT = 0.34;
