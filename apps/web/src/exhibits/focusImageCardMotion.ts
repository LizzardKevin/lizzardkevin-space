export type FocusImageCardMotion = {
  rotateXDeg: number;
  rotateYDeg: number;
  translateXPx: number;
  translateYPx: number;
  translateZPx: number;
  scale: number;
  glassAngleDeg: number;
  glassOpacity: number;
};

type FocusImageCardMotionInput = {
  frameLeft: number;
  frameTop: number;
  frameWidth: number;
  frameHeight: number;
  pointerX: number;
  pointerY: number;
  viewportWidth: number;
  viewportHeight: number;
  hovering: boolean;
};

const PAGE_MOTION = {
  rotateXDeg: 1.6,
  rotateYDeg: 3.2,
  translateXPx: 7,
  translateYPx: 3,
  translateZPx: 6,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundMotion(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function normalizeAngleDeg(value: number) {
  const normalized = ((value % 360) + 360) % 360;
  return roundMotion(normalized);
}

export function resolveFocusImageCardMotion({
  frameLeft,
  frameTop,
  frameWidth,
  frameHeight,
  pointerX,
  pointerY,
  viewportWidth,
  viewportHeight,
  hovering,
}: FocusImageCardMotionInput): FocusImageCardMotion {
  const frameCenterX = frameLeft + frameWidth / 2;
  const frameCenterY = frameTop + frameHeight / 2;
  const horizontalRange = Math.max(1, viewportWidth / 2);
  const verticalRange = Math.max(1, viewportHeight / 2);
  const normalizedX = clamp((pointerX - frameCenterX) / horizontalRange, -1, 1);
  const normalizedY = clamp((pointerY - frameCenterY) / verticalRange, -1, 1);
  const depth = Math.max(Math.abs(normalizedX), Math.abs(normalizedY)) * PAGE_MOTION.translateZPx;
  const pointerDx = pointerX - frameCenterX;
  const pointerDy = pointerY - frameCenterY;
  const pointerDistance = Math.hypot(pointerDx, pointerDy);
  const glassAngleDeg =
    pointerDistance < 0.5 ? 0 : normalizeAngleDeg((Math.atan2(pointerDy, pointerDx) * 180) / Math.PI + 90);
  const glassTravel = Math.max(Math.abs(normalizedX), Math.abs(normalizedY));
  const baseGlassOpacity = hovering ? 0.28 : 0.1;
  const glassRange = hovering ? 0.22 : 0.12;

  return {
    rotateXDeg: roundMotion(-normalizedY * PAGE_MOTION.rotateXDeg),
    rotateYDeg: roundMotion(normalizedX * PAGE_MOTION.rotateYDeg),
    translateXPx: roundMotion(normalizedX * PAGE_MOTION.translateXPx),
    translateYPx: roundMotion(normalizedY * PAGE_MOTION.translateYPx),
    translateZPx: roundMotion(depth),
    scale: 1,
    glassAngleDeg,
    glassOpacity: pointerDistance < 0.5 ? 0 : roundMotion(baseGlassOpacity + glassTravel * glassRange),
  };
}
