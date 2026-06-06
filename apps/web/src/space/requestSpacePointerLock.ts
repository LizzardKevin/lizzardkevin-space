/** 在用户点击/按键回调中同步调用，避免 rAF 导致手势失效。 */
export function requestSpacePointerLock() {
  const canvas = document.getElementById("space-canvas") as HTMLCanvasElement | null;
  if (canvas) {
    void canvas.requestPointerLock?.();
    return;
  }
  queueMicrotask(() => {
    const el = document.getElementById("space-canvas") as HTMLCanvasElement | null;
    void el?.requestPointerLock?.();
  });
}

export function releaseSpacePointerLock() {
  if (document.pointerLockElement) {
    document.exitPointerLock();
  }
}

/** 与点击「进入 SPACE」相同：在用户手势内同步锁定鼠标。 */
export function resumeSpaceFirstPerson() {
  requestSpacePointerLock();
}

/** 已入场且非全屏 overlay 时恢复第一人称（Focus 退出等场景）。 */
export function engageSpaceFirstPerson(opts: { entered: boolean; overlayOpen: boolean }) {
  if (!opts.entered || opts.overlayOpen) return;
  resumeSpaceFirstPerson();
}

let pendingGestureResume = false;

function engageSpaceFirstPersonNow(opts: { entered: boolean; overlayOpen: boolean }) {
  if (opts.overlayOpen) return;
  if (opts.entered) resumeSpaceFirstPerson();
  else engageSpaceFirstPerson({ entered: opts.entered, overlayOpen: opts.overlayOpen });
}

/**
 * Focus 用 ESC 退出：同一 keydown 内 requestPointerLock 会被浏览器 ESC 默认行为立刻解锁。
 * 在 keyup 后再锁定；若仍失败则等下一次 SPACE pointerdown 补锁。
 */
export function resumeSpaceFirstPersonAfterEscape(opts: { entered: boolean; overlayOpen: boolean }) {
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    window.removeEventListener("keyup", onKeyUp);
    engageSpaceFirstPersonNow(opts);
    queueMicrotask(() => {
      if (document.pointerLockElement) {
        pendingGestureResume = false;
        return;
      }
      pendingGestureResume = true;
    });
  };
  window.addEventListener("keyup", onKeyUp);
}

/** ESC 补锁：下一次 SPACE 画布点击/指针按下时同步调用。 */
export function resumeSpaceFirstPersonOnGestureIfPending() {
  if (!pendingGestureResume || document.pointerLockElement) {
    pendingGestureResume = false;
    return;
  }
  pendingGestureResume = false;
  resumeSpaceFirstPerson();
}
