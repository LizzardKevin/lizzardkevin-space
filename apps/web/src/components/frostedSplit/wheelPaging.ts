export type WheelPagingDirection = "up" | "down";

export type WheelPagingState = {
  amount: number;
  cooldownUntil: number;
  direction: WheelPagingDirection | null;
  lastWheelAt: number;
};

export type WheelPagingInput = {
  currentIndex: number;
  deltaY: number;
  nowMs: number;
  total: number;
};

export type WheelPagingOutcome =
  | { kind: "idle" }
  | { kind: "rebound"; direction: WheelPagingDirection }
  | { kind: "select"; direction: WheelPagingDirection; nextIndex: number };

export const WHEEL_PAGING_THRESHOLD = 160;
export const WHEEL_PAGING_WINDOW_MS = 360;
export const WHEEL_PAGING_COOLDOWN_MS = 620;

export function createWheelPagingState(): WheelPagingState {
  return {
    amount: 0,
    cooldownUntil: 0,
    direction: null,
    lastWheelAt: 0,
  };
}

export function resolveWheelPaging(
  state: WheelPagingState,
  { currentIndex, deltaY, nowMs, total }: WheelPagingInput,
): WheelPagingOutcome {
  if (total <= 0 || deltaY === 0 || nowMs < state.cooldownUntil) return { kind: "idle" };

  const direction: WheelPagingDirection = deltaY > 0 ? "down" : "up";
  const elapsed = nowMs - state.lastWheelAt;

  if (state.direction !== direction || elapsed > WHEEL_PAGING_WINDOW_MS) {
    state.amount = Math.abs(deltaY);
    state.direction = direction;
  } else {
    state.amount += Math.abs(deltaY);
  }

  state.lastWheelAt = nowMs;

  if (state.amount < WHEEL_PAGING_THRESHOLD) return { kind: "idle" };

  state.amount = 0;
  state.cooldownUntil = nowMs + WHEEL_PAGING_COOLDOWN_MS;

  if (direction === "up") {
    if (currentIndex <= 0) return { kind: "rebound", direction };
    return { kind: "select", direction, nextIndex: currentIndex - 1 };
  }

  if (currentIndex >= total - 1) return { kind: "rebound", direction };
  return { kind: "select", direction, nextIndex: currentIndex + 1 };
}
