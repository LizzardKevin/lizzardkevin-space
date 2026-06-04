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

/** 与「进入 SPACE」相同：已入场且非全屏 overlay 时锁定鼠标。须在用户手势内同步调用。 */
export function engageSpaceFirstPerson(opts: { entered: boolean; overlayOpen: boolean }) {
  if (!opts.entered || opts.overlayOpen) return;
  requestSpacePointerLock();
}
