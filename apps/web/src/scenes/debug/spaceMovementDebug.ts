export const SPACE_MOVEMENT_DEBUG_EVENT = "space:movement-debug";
export const SPACE_RAYCAST_DEBUG_EVENT = "space:raycast-debug";
export const SPACE_EXHIBIT_PLACEMENT_DEBUG_EVENT = "space:exhibit-placement-debug";
export const SPACE_MOVEMENT_DEBUG_HISTORY_LIMIT = 600;

export type SpaceLookRotationDebugSample = {
  tick: number;
  yawDeg: number;
  pitchDeg: number;
  deltaYawDeg: number;
  deltaPitchDeg: number;
  deltaTotalDeg: number;
};

export type SpaceFrameRateDebugSample = {
  fps: number;
  frameMs: number;
};

export type SpaceMovementDebugSample = {
  timestamp: number;
  enabled: boolean;
  grounded: boolean;
  collisionCount: number;
  contactNames: string[];
  position: { x: number; y: number; z: number };
  desiredSpeed: number;
  actualSpeed: number;
  targetSpeed: number;
  speedRatio: number | null;
  verticalVelocity: number;
  lookRotation: SpaceLookRotationDebugSample;
  frameRate: SpaceFrameRateDebugSample;
  dt: number;
};

export type SpaceRaycastDebugSample = {
  timestamp: number;
  hitMeshName: string | null;
};

export type SpaceExhibitPlacementDebugSample = {
  timestamp: number;
  exhibitId: string;
  anchorName: string;
  lod: string | null;
  floorName: string | null;
};

declare global {
  interface Window {
    __SPACE_MOVEMENT_DEBUG_SAMPLES__?: SpaceMovementDebugSample[];
  }

  interface WindowEventMap {
    "space:movement-debug": CustomEvent<SpaceMovementDebugSample>;
    "space:raycast-debug": CustomEvent<SpaceRaycastDebugSample>;
    "space:exhibit-placement-debug": CustomEvent<SpaceExhibitPlacementDebugSample>;
  }
}

const colliderDebugNames = new Map<number, string>();

function radToDeg(value: number) {
  return (value * 180) / Math.PI;
}

function normalizeDeltaDeg(value: number) {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

export function buildSpaceLookRotationDebugSample({
  tick,
  yawRad,
  pitchRad,
  previous,
}: {
  tick: number;
  yawRad: number;
  pitchRad: number;
  previous: SpaceLookRotationDebugSample | null;
}): SpaceLookRotationDebugSample {
  const yawDeg = radToDeg(yawRad);
  const pitchDeg = radToDeg(pitchRad);
  const deltaYawDeg = previous ? normalizeDeltaDeg(yawDeg - previous.yawDeg) : 0;
  const deltaPitchDeg = previous ? normalizeDeltaDeg(pitchDeg - previous.pitchDeg) : 0;

  return {
    tick,
    yawDeg,
    pitchDeg,
    deltaYawDeg,
    deltaPitchDeg,
    deltaTotalDeg: Math.hypot(deltaYawDeg, deltaPitchDeg),
  };
}

export function buildSpaceFrameRateDebugSample({
  deltaSec,
  previous,
}: {
  deltaSec: number;
  previous: SpaceFrameRateDebugSample | null;
}): SpaceFrameRateDebugSample {
  const rawFrameMs = Number.isFinite(deltaSec) && deltaSec > 0 ? deltaSec * 1000 : 0;
  const frameMs = previous ? previous.frameMs * 0.82 + rawFrameMs * 0.18 : rawFrameMs;
  return {
    fps: frameMs > 0 ? 1000 / frameMs : 0,
    frameMs,
  };
}

export function registerSpaceCollisionDebugCollider(
  collider: { handle: number } | null | undefined,
  name: string,
) {
  if (!import.meta.env.DEV || !collider) return () => {};

  const handle = collider.handle;
  colliderDebugNames.set(handle, name);
  return () => {
    if (colliderDebugNames.get(handle) === name) {
      colliderDebugNames.delete(handle);
    }
  };
}

export function resolveSpaceCollisionDebugName(collider: { handle: number } | null | undefined) {
  if (!collider) return null;
  return colliderDebugNames.get(collider.handle) ?? `unknown#${collider.handle}`;
}

export function publishSpaceMovementDebug(sample: SpaceMovementDebugSample) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  const samples = (window.__SPACE_MOVEMENT_DEBUG_SAMPLES__ ??= []);
  samples.push(sample);
  if (samples.length > SPACE_MOVEMENT_DEBUG_HISTORY_LIMIT) {
    samples.splice(0, samples.length - SPACE_MOVEMENT_DEBUG_HISTORY_LIMIT);
  }
  window.dispatchEvent(new CustomEvent(SPACE_MOVEMENT_DEBUG_EVENT, { detail: sample }));
}

export function publishSpaceRaycastDebug(sample: SpaceRaycastDebugSample) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SPACE_RAYCAST_DEBUG_EVENT, { detail: sample }));
}

export function publishSpaceExhibitPlacementDebug(sample: SpaceExhibitPlacementDebugSample) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SPACE_EXHIBIT_PLACEMENT_DEBUG_EVENT, { detail: sample }));
}
