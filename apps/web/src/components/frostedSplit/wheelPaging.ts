export type WheelPagingDirection = "up" | "down";

export type WheelPagingState = {
  amount: number;
  direction: WheelPagingDirection | null;
  lastWheelAt: number;
  locked: boolean;
};

export type DragPagingState = {
  active: boolean;
  direction: WheelPagingDirection | null;
  locked: boolean;
  startY: number;
};

export type WheelPagingInput = {
  currentIndex: number;
  deltaY: number;
  nowMs: number;
  total: number;
};

export type DragPagingInput = {
  currentIndex: number;
  pointerY: number;
  total: number;
};

export type WheelPagingOutcome =
  | { kind: "idle" }
  | { kind: "track"; direction: WheelPagingDirection; progress: number }
  | { kind: "locked" }
  | { kind: "settle"; direction: WheelPagingDirection }
  | { kind: "rebound"; direction: WheelPagingDirection }
  | { kind: "select"; direction: WheelPagingDirection; nextIndex: number };

export const WHEEL_PAGING_THRESHOLD = 160;
export const WHEEL_PAGING_WINDOW_MS = 360;
export const WHEEL_PAGING_GESTURE_UNLOCK_MS = 280;

export function createWheelPagingState(): WheelPagingState {
  return {
    amount: 0,
    direction: null,
    lastWheelAt: 0,
    locked: false,
  };
}

export function createDragPagingState(): DragPagingState {
  return {
    active: false,
    direction: null,
    locked: false,
    startY: 0,
  };
}

export function getRelativeSelectionDirection(currentIndex: number, nextIndex: number): WheelPagingDirection | null {
  if (nextIndex === currentIndex) return null;
  return nextIndex > currentIndex ? "down" : "up";
}

export function beginDragPaging(
  state: DragPagingState,
  { pointerY }: { pointerY: number; nowMs: number },
) {
  state.active = true;
  state.direction = null;
  state.locked = false;
  state.startY = pointerY;
}

export function resolveWheelPaging(
  state: WheelPagingState,
  { currentIndex, deltaY, nowMs, total }: WheelPagingInput,
): WheelPagingOutcome {
  if (total <= 0 || deltaY === 0) return { kind: "idle" };

  if (state.locked) {
    const idleTime = nowMs - state.lastWheelAt;
    if (idleTime <= WHEEL_PAGING_GESTURE_UNLOCK_MS) {
      state.lastWheelAt = nowMs;
      return { kind: "locked" };
    }

    state.amount = 0;
    state.direction = null;
    state.locked = false;
  }

  const direction: WheelPagingDirection = deltaY > 0 ? "down" : "up";
  const elapsed = nowMs - state.lastWheelAt;

  if (state.direction !== direction || elapsed > WHEEL_PAGING_WINDOW_MS) {
    state.amount = Math.abs(deltaY);
    state.direction = direction;
  } else {
    state.amount += Math.abs(deltaY);
  }

  state.lastWheelAt = nowMs;

  if (state.amount < WHEEL_PAGING_THRESHOLD) {
    return {
      kind: "track",
      direction,
      progress: Math.min(1, state.amount / WHEEL_PAGING_THRESHOLD),
    };
  }

  state.amount = 0;
  state.locked = true;

  if (direction === "up") {
    if (currentIndex <= 0) return { kind: "rebound", direction };
    return { kind: "select", direction, nextIndex: currentIndex - 1 };
  }

  if (currentIndex >= total - 1) return { kind: "rebound", direction };
  return { kind: "select", direction, nextIndex: currentIndex + 1 };
}

export function resolveDragPaging(
  state: DragPagingState,
  { currentIndex, pointerY, total }: DragPagingInput,
): WheelPagingOutcome {
  if (!state.active || total <= 0) return { kind: "idle" };
  if (state.locked) return { kind: "locked" };

  const deltaY = state.startY - pointerY;
  if (deltaY === 0) return { kind: "idle" };

  const direction: WheelPagingDirection = deltaY > 0 ? "down" : "up";
  const amount = Math.abs(deltaY);
  state.direction = direction;

  if (amount < WHEEL_PAGING_THRESHOLD) {
    return {
      kind: "track",
      direction,
      progress: Math.min(1, amount / WHEEL_PAGING_THRESHOLD),
    };
  }

  state.locked = true;

  if (direction === "up") {
    if (currentIndex <= 0) return { kind: "rebound", direction };
    return { kind: "select", direction, nextIndex: currentIndex - 1 };
  }

  if (currentIndex >= total - 1) return { kind: "rebound", direction };
  return { kind: "select", direction, nextIndex: currentIndex + 1 };
}

export function releaseDragPaging(state: DragPagingState): WheelPagingOutcome {
  const direction = state.direction;
  state.active = false;
  state.direction = null;
  state.locked = false;
  state.startY = 0;

  if (!direction) return { kind: "idle" };
  return { kind: "settle", direction };
}
