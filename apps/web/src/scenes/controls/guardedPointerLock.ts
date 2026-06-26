export const POINTER_LOCK_MOUSE_SENSITIVITY = 0.002;
export const POINTER_LOCK_MAX_DELTA_PX = 96;
export const POINTER_LOCK_WARMUP_MOVES = 2;
export const POINTER_LOCK_DEBUG_HISTORY_LIMIT = 600;

export type GuardedPointerDelta = {
  movementX: number;
  movementY: number;
  dropped: boolean;
  reason: "spike" | "warmup" | null;
};

export type GuardedPointerLockDebugSample = {
  timestamp: number;
  rawMovementX: number;
  rawMovementY: number;
  appliedMovementX: number;
  appliedMovementY: number;
  dropped: boolean;
  reason: GuardedPointerDelta["reason"];
};

declare global {
  interface Window {
    __SPACE_POINTER_LOCK_DEBUG_SAMPLES__?: GuardedPointerLockDebugSample[];
  }
}

export function resolveGuardedPointerDelta({
  movementX,
  movementY,
  skip = false,
}: {
  movementX: number;
  movementY: number;
  skip?: boolean;
}): GuardedPointerDelta {
  if (skip) {
    return { movementX: 0, movementY: 0, dropped: true, reason: "warmup" };
  }

  if (
    !Number.isFinite(movementX) ||
    !Number.isFinite(movementY) ||
    Math.abs(movementX) > POINTER_LOCK_MAX_DELTA_PX ||
    Math.abs(movementY) > POINTER_LOCK_MAX_DELTA_PX
  ) {
    return { movementX: 0, movementY: 0, dropped: true, reason: "spike" };
  }

  return { movementX, movementY, dropped: false, reason: null };
}

export function requestPointerLockWithRawFallback(
  element: HTMLElement,
  onError?: (error: unknown) => void,
) {
  const requestPointerLock = element.requestPointerLock as
    | ((options?: { unadjustedMovement?: boolean }) => Promise<void> | void)
    | undefined;

  if (!requestPointerLock) {
    onError?.("Pointer Lock API is unavailable");
    return;
  }

  try {
    const request = requestPointerLock.call(element, { unadjustedMovement: true });
    if (request && typeof request.catch === "function") {
      request.catch(() => {
        try {
          const fallback = requestPointerLock.call(element);
          if (fallback && typeof fallback.catch === "function") fallback.catch(onError);
        } catch (fallbackError) {
          onError?.(fallbackError);
        }
      });
    }
  } catch {
    try {
      const fallback = requestPointerLock.call(element);
      if (fallback && typeof fallback.catch === "function") fallback.catch(onError);
    } catch (fallbackError) {
      onError?.(fallbackError);
    }
  }
}

export function publishGuardedPointerLockDebugSample(sample: GuardedPointerLockDebugSample) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  const samples = (window.__SPACE_POINTER_LOCK_DEBUG_SAMPLES__ ??= []);
  samples.push(sample);
  if (samples.length > POINTER_LOCK_DEBUG_HISTORY_LIMIT) {
    samples.splice(0, samples.length - POINTER_LOCK_DEBUG_HISTORY_LIMIT);
  }
}
