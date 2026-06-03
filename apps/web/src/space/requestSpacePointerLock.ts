/** 在用户点击回调中同步调用，避免 rAF 导致手势失效。 */
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
