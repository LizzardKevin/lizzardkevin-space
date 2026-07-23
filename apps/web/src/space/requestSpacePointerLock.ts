import { requestSpaceCursorReturn } from "../cursor/spaceCursorController";
import { requestPointerLockWithRawFallback } from "../scenes/controls/guardedPointerLock";
import {
  isPermanentPointerLockFailure,
  POINTER_LOCK_RESUME_TIMEOUT_MS,
} from "./pointerLockFailure";
import { resolveSpacePointerLockTarget } from "./spacePointerLockTarget";

let nextPointerLockRequestId = 0;
let pendingGestureResumeRequestId: number | null = null;
let pendingEscapePointerLockRecovery: { cancel: () => void } | null = null;

export const SPACE_POINTER_LOCK_FAILED_EVENT = "space:pointer-lock-failed";
const ESCAPE_POINTER_LOCK_RECOVERY_EXPIRY_MS = 2_000;

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
  pendingEscapePointerLockRecovery?.cancel();
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
  if (opts.overlayOpen || !opts.entered) return;
  resumeSpaceFirstPerson(requestId);
}

/**
 * Focus / 三页 ESC 回 SPACE：同一 keydown 内 requestPointerLock 会被浏览器 ESC 立刻解锁。
 * 在 keyup 当帧请求锁定（不再等 cursor 回中动画），避免用户左键先点到展品又进作品页。
 */
export function resumeSpaceFirstPersonAfterEscape(
  opts: { entered: boolean; overlayOpen: boolean },
  requestId = reserveSpacePointerLockRequestId(),
) {
  pendingEscapePointerLockRecovery?.cancel();

  let cancelled = false;
  let expiryTimerId: number | null = null;

  function cleanup() {
    if (cancelled) return;
    cancelled = true;
    window.removeEventListener("keyup", onKeyUp);
    document.removeEventListener("pointerlockchange", onPointerLockChange);
    window.removeEventListener("blur", cleanup);
    window.removeEventListener("pagehide", cleanup);
    if (expiryTimerId !== null) window.clearTimeout(expiryTimerId);
    if (pendingEscapePointerLockRecovery === recovery) {
      pendingEscapePointerLockRecovery = null;
    }
  }

  function onPointerLockChange() {
    if (document.pointerLockElement) cleanup();
  }

  function engageAfterEscapeKeyUp() {
    window.removeEventListener("keyup", onKeyUp);
    requestSpaceCursorReturn({ target: "center" });
    engageSpaceFirstPersonNow(opts, requestId);
    // 保持 pending 直到真正 lock 成功，继续挡住展品点击
    document.addEventListener("pointerlockchange", onPointerLockChange);
    if (expiryTimerId !== null) window.clearTimeout(expiryTimerId);
    expiryTimerId = window.setTimeout(cleanup, 400);
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key !== "Escape") return;
    engageAfterEscapeKeyUp();
  }

  const recovery = { cancel: cleanup };
  pendingEscapePointerLockRecovery = recovery;
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", cleanup);
  window.addEventListener("pagehide", cleanup);
  expiryTimerId = window.setTimeout(cleanup, ESCAPE_POINTER_LOCK_RECOVERY_EXPIRY_MS);
  return requestId;
}

/** ESC 回 SPACE 后、指针锁尚未恢复前：用于挡住展品点击误进作品页。 */
export function isPendingEscapePointerLockRecovery() {
  return pendingEscapePointerLockRecovery !== null;
}
