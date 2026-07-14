import { requestSpaceCursorReturn } from "../cursor/spaceCursorController";
import { requestPointerLockWithRawFallback } from "../scenes/controls/guardedPointerLock";
import {
  isPermanentPointerLockFailure,
  POINTER_LOCK_RESUME_TIMEOUT_MS,
} from "./pointerLockFailure";
import { resolveSpacePointerLockTarget } from "./spacePointerLockTarget";

let nextPointerLockRequestId = 0;
let pendingGestureResumeRequestId: number | null = null;

export const SPACE_POINTER_LOCK_FAILED_EVENT = "space:pointer-lock-failed";

export type SpacePointerLockFailureDetail = {
  message: string;
  permanent: boolean;
  requestId: number;
};

export function reserveSpacePointerLockRequestId() {
  nextPointerLockRequestId += 1;
  return nextPointerLockRequestId;
}

function reportPointerLockFailure(error: unknown, requestId: number) {
  if (pendingGestureResumeRequestId === requestId) {
    pendingGestureResumeRequestId = null;
  }
  const message = error instanceof Error ? error.message : String(error);
  window.dispatchEvent(
    new CustomEvent(SPACE_POINTER_LOCK_FAILED_EVENT, {
      detail: {
        requestId,
        message,
        permanent: isPermanentPointerLockFailure(message),
      },
    }),
  );
}

function requestPointerLockSafely(el: HTMLElement, requestId: number) {
  requestPointerLockWithRawFallback(el, (error) => reportPointerLockFailure(error, requestId));
}

function trackPendingPointerLock(el: HTMLElement, requestId: number) {
  pendingGestureResumeRequestId = requestId;
  queueMicrotask(() => {
    if (
      pendingGestureResumeRequestId === requestId &&
      document.pointerLockElement === el
    ) {
      pendingGestureResumeRequestId = null;
    }
  });
  window.setTimeout(() => {
    if (document.pointerLockElement === el) {
      if (pendingGestureResumeRequestId === requestId) {
        pendingGestureResumeRequestId = null;
      }
      return;
    }
    if (pendingGestureResumeRequestId !== requestId) return;
    reportPointerLockFailure("Pointer lock request did not complete", requestId);
  }, POINTER_LOCK_RESUME_TIMEOUT_MS);
}

/** 在用户点击/按键回调中同步调用，避免 rAF 导致手势失效。 */
export function requestSpacePointerLock(requestId = reserveSpacePointerLockRequestId()) {
  const canvas = resolveSpacePointerLockTarget();
  if (canvas) {
    trackPendingPointerLock(canvas, requestId);
    requestPointerLockSafely(canvas, requestId);
    return requestId;
  }
  queueMicrotask(() => {
    const el = resolveSpacePointerLockTarget();
    if (!el) {
      reportPointerLockFailure("Space canvas was not ready", requestId);
      return;
    }
    trackPendingPointerLock(el, requestId);
    requestPointerLockSafely(el, requestId);
  });
  return requestId;
}

export function releaseSpacePointerLock() {
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
}

/** 与点击「进入 SPACE」相同：在用户手势内同步锁定鼠标。 */
export function resumeSpaceFirstPerson(requestId?: number) {
  return requestSpacePointerLock(requestId);
}

/** 带自定义 cursor 回中心动画的恢复；pointer lock 在同一用户手势内先请求。 */
export function resumeSpaceFirstPersonWithCursorReturn(requestId?: number) {
  const pointerLockRequestId = requestSpacePointerLock(requestId);
  requestSpaceCursorReturn({ target: "center" });
  return pointerLockRequestId;
}

/** 已入场且非全屏 overlay 时恢复第一人称（Focus 退出等场景）。 */
export function engageSpaceFirstPerson(
  opts: { entered: boolean; overlayOpen: boolean },
  requestId?: number,
) {
  if (!opts.entered || opts.overlayOpen) return;
  return resumeSpaceFirstPerson(requestId);
}

function engageSpaceFirstPersonNow(
  opts: { entered: boolean; overlayOpen: boolean },
  requestId: number,
) {
  if (opts.overlayOpen) return;
  if (opts.entered) resumeSpaceFirstPerson(requestId);
  else engageSpaceFirstPerson({ entered: opts.entered, overlayOpen: opts.overlayOpen }, requestId);
}

/**
 * Focus 用 ESC 退出：同一 keydown 内 requestPointerLock 会被浏览器 ESC 默认行为立刻解锁。
 * 在 keyup 后再尝试锁定；后续真实 Canvas click 仍由 GuardedPointerLockControls 唯一处理。
 */
export function resumeSpaceFirstPersonAfterEscape(
  opts: { entered: boolean; overlayOpen: boolean },
  requestId = reserveSpacePointerLockRequestId(),
) {
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    window.removeEventListener("keyup", onKeyUp);
    requestSpaceCursorReturn({ target: "center" });
    window.setTimeout(() => {
      engageSpaceFirstPersonNow(opts, requestId);
    }, 500);
  };
  window.addEventListener("keyup", onKeyUp);
  return requestId;
}
