export function requestPointerLockFromReadyCanvasGesture({
  gestureTarget,
  readyCanvas,
  controlsEligible,
  pointerLocked,
  request,
}: {
  gestureTarget: unknown;
  readyCanvas: object | null;
  controlsEligible: boolean;
  pointerLocked: boolean;
  request: () => void;
}) {
  if (!readyCanvas || gestureTarget !== readyCanvas || !controlsEligible || pointerLocked) return false;
  request();
  return true;
}
