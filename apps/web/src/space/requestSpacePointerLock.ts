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
/** ESC keyup 请求被拒后,pointerdown 兜底保持武装的时长(期间继续挡住展品误点)。 */
const ESCAPE_POINTER_LOCK_FALLBACK_EXPIRY_MS = 2_000;

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
function requestSpacePointerLockCore(requestId: number) {
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

/** 外部手势链的锁定请求:取消挂起的 ESC 兜底,由本次手势接管。 */
export function requestSpacePointerLock(requestId = reserveSpacePointerLockRequestId()) {
  pendingEscapePointerLockRecovery?.cancel();
  return requestSpacePointerLockCore(requestId);
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

/** ESC 恢复链内部的锁定请求:走 core,不取消自身 pending recovery(pending 保持到锁定成功)。 */
function engageSpaceFirstPersonNow(
  opts: { entered: boolean; overlayOpen: boolean },
  requestId: number,
) {
  if (opts.overlayOpen || !opts.entered) return;
  requestSpacePointerLockCore(requestId);
}

/**
 * Focus / 三页 ESC 回 SPACE。
 * Chrome 里 ESC 的 keydown 与 keyup 都不构成 transient user activation
 * (HTML 规范把 Esc 排除在 activation triggering input event 之外,keyup 整个不在列表内;
 * 实测:两者的处理器里 navigator.userActivation.isActive 均为 false,
 * requestPointerLock 被 NotAllowedError "A user gesture is required to request Pointer Lock" 拒绝)。
 * 因此 keyup 当帧先请求一次(对不强制手势的浏览器立即生效),同时武装 pointerdown 兜底:
 * 被拒绝后,下一次 pointerdown(真实用户激活)在同一事件内补请求,直到锁定成功或有界过期。
 * recovery 内部走 core 请求、不自我取消:pending 真正保持到锁定成功,
 * 期间继续挡住展品点击,避免用户左键先点到展品又进作品页。
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
    window.removeEventListener("pointerdown", onPointerDownFallback, true);
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

  function onPointerDownFallback() {
    if (document.pointerLockElement) return;
    // Chrome 会拒绝 ESC keyup 当帧的请求(无用户激活);在真实 pointer 手势内补请求。
    // 走 core 不取消自身 recovery:pending 保持到本次锁定真正成功,期间继续挡住展品误点。
    engageSpaceFirstPersonNow(opts, requestId);
  }

  function engageAfterEscapeKeyUp() {
    window.removeEventListener("keyup", onKeyUp);
    requestSpaceCursorReturn({ target: "center" });
    engageSpaceFirstPersonNow(opts, requestId);
    // 保持 pending 直到真正 lock 成功,继续挡住展品点击
    document.addEventListener("pointerlockchange", onPointerLockChange);
    window.addEventListener("pointerdown", onPointerDownFallback, true);
    if (expiryTimerId !== null) window.clearTimeout(expiryTimerId);
    expiryTimerId = window.setTimeout(cleanup, ESCAPE_POINTER_LOCK_FALLBACK_EXPIRY_MS);
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
