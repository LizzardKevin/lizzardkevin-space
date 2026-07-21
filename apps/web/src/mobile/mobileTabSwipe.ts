export type MobileTabSwipeDirection = "prev" | "next";

export type MobileTabSwipeAxis = "none" | "horizontal" | "vertical";

export type MobileTabSwipeState = {
  active: boolean;
  axis: MobileTabSwipeAxis;
  pointerId: number | null;
  startX: number;
  startY: number;
  offsetX: number;
};

export type MobileTabSwipeTrackOutcome =
  | { kind: "idle" }
  | { kind: "ignore" }
  | { kind: "engage"; offsetX: number }
  | { kind: "track"; offsetX: number };

export type MobileTabSwipeReleaseOutcome =
  | { kind: "idle" }
  | { kind: "rebound"; offsetX: number }
  | { kind: "advance"; direction: MobileTabSwipeDirection; nextIndex: number; offsetX: number };

export const TAB_SWIPE_ENGAGE_PX = 12;
export const TAB_SWIPE_AXIS_RATIO = 1.25;
export const TAB_SWIPE_THRESHOLD_PX = 72;
export const TAB_SWIPE_EDGE_RESISTANCE = 0.35;

export function createMobileTabSwipeState(): MobileTabSwipeState {
  return {
    active: false,
    axis: "none",
    pointerId: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
  };
}

export function beginMobileTabSwipe(
  state: MobileTabSwipeState,
  { pointerId, x, y }: { pointerId: number; x: number; y: number },
) {
  state.active = true;
  state.axis = "none";
  state.pointerId = pointerId;
  state.startX = x;
  state.startY = y;
  state.offsetX = 0;
}

export function resetMobileTabSwipe(state: MobileTabSwipeState) {
  state.active = false;
  state.axis = "none";
  state.pointerId = null;
  state.startX = 0;
  state.startY = 0;
  state.offsetX = 0;
}

export function resolveTabSwipeOffset(offsetX: number, currentIndex: number, total: number): number {
  const atFirst = currentIndex <= 0;
  const atLast = total <= 0 || currentIndex >= total - 1;
  if ((atFirst && offsetX > 0) || (atLast && offsetX < 0)) {
    return offsetX * TAB_SWIPE_EDGE_RESISTANCE;
  }
  return offsetX;
}

export function resolveMobileTabSwipeMove(
  state: MobileTabSwipeState,
  { x, y, currentIndex, total }: { x: number; y: number; currentIndex: number; total: number },
): MobileTabSwipeTrackOutcome {
  if (!state.active) return { kind: "idle" };
  if (state.axis === "vertical") return { kind: "ignore" };

  const deltaX = x - state.startX;
  const deltaY = y - state.startY;

  if (state.axis === "none") {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    if (absX >= TAB_SWIPE_ENGAGE_PX && absX > absY * TAB_SWIPE_AXIS_RATIO) {
      state.axis = "horizontal";
      state.offsetX = resolveTabSwipeOffset(deltaX, currentIndex, total);
      return { kind: "engage", offsetX: state.offsetX };
    }
    if (absY >= TAB_SWIPE_ENGAGE_PX && absY > absX * TAB_SWIPE_AXIS_RATIO) {
      state.axis = "vertical";
      return { kind: "ignore" };
    }
    return { kind: "idle" };
  }

  state.offsetX = resolveTabSwipeOffset(deltaX, currentIndex, total);
  return { kind: "track", offsetX: state.offsetX };
}

export function resolveMobileTabSwipeRelease(
  state: MobileTabSwipeState,
  { currentIndex, total }: { currentIndex: number; total: number },
): MobileTabSwipeReleaseOutcome {
  if (!state.active) return { kind: "idle" };

  const wasHorizontal = state.axis === "horizontal";
  const offsetX = state.offsetX;
  resetMobileTabSwipe(state);
  if (!wasHorizontal || total <= 0) return { kind: "idle" };

  if (Math.abs(offsetX) >= TAB_SWIPE_THRESHOLD_PX) {
    if (offsetX < 0 && currentIndex < total - 1) {
      return { kind: "advance", direction: "next", nextIndex: currentIndex + 1, offsetX };
    }
    if (offsetX > 0 && currentIndex > 0) {
      return { kind: "advance", direction: "prev", nextIndex: currentIndex - 1, offsetX };
    }
  }

  return { kind: "rebound", offsetX };
}
