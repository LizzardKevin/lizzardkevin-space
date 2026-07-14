export type AudioLoopKind = "bgm" | "ambient";

export type AudioPlaybackPolicy = {
  routePaused: boolean;
  bgmDucked: boolean;
  ambientDucked: boolean;
};

const DUCK_RATIOS: Record<AudioLoopKind, number> = {
  bgm: 0.45,
  ambient: 0.35,
};

export function createAudioPlaybackPolicy(): AudioPlaybackPolicy {
  return { routePaused: false, bgmDucked: false, ambientDucked: false };
}

export function setRoutePaused(policy: AudioPlaybackPolicy, routePaused: boolean): AudioPlaybackPolicy {
  return { ...policy, routePaused };
}

export function setLoopDucked(
  policy: AudioPlaybackPolicy,
  kind: AudioLoopKind,
  ducked: boolean,
): AudioPlaybackPolicy {
  return kind === "bgm" ? { ...policy, bgmDucked: ducked } : { ...policy, ambientDucked: ducked };
}

export function effectiveLoopVolume(
  policy: AudioPlaybackPolicy,
  kind: AudioLoopKind,
  baseVolume: number,
) {
  const ducked = kind === "bgm" ? policy.bgmDucked : policy.ambientDucked;
  return ducked ? baseVolume * DUCK_RATIOS[kind] : baseVolume;
}

export function canStartAsyncAudio(policy: AudioPlaybackPolicy) {
  return !policy.routePaused;
}

export function effectiveProceduralAmbientGain(
  policy: AudioPlaybackPolicy,
  masterVolume: number,
  ambientVolume: number,
) {
  return effectiveLoopVolume(policy, "ambient", masterVolume * ambientVolume);
}

export function resolveAmbientLoadErrorAction(
  policy: AudioPlaybackPolicy,
  isCurrentLoop: boolean,
): "ignore" | "defer-fallback" | "start-fallback" {
  if (!isCurrentLoop) return "ignore";
  return canStartAsyncAudio(policy) ? "start-fallback" : "defer-fallback";
}
