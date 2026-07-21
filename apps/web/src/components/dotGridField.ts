export const DOT_GRID_FIELD_SPACING_PX = 22;
export const DOT_GRID_FIELD_RADIUS_PX = 200;
export const DOT_GRID_MAX_PULL_PX = 18;
export const DOT_GRID_BASE_DOT_PX = 2;
export const DOT_GRID_MAX_DOT_PX = 4.5;

export type DotGridPoint = Readonly<{ x: number; y: number }>;

export function buildDotGridPoints(
  width: number,
  height: number,
  spacing = DOT_GRID_FIELD_SPACING_PX,
): DotGridPoint[] {
  if (width <= 0 || height <= 0 || spacing <= 0) return [];
  const points: DotGridPoint[] = [];
  const offsetX = spacing / 2;
  const offsetY = spacing / 2;
  for (let y = offsetY; y < height; y += spacing) {
    for (let x = offsetX; x < width; x += spacing) {
      points.push({ x, y });
    }
  }
  return points;
}

/** 0 when outside the field, 1 at the pointer core — same falloff family as the start lobby. */
export function resolveDotFieldInfluence(distance: number, radiusPx: number): number {
  if (radiusPx <= 0 || distance >= radiusPx) return 0;
  return Math.min(1, Math.max(0, 1 - distance / radiusPx));
}

/** Smoothstep² of the raw influence — matches the lobby's pointer-dot easing curve. */
export function resolveDotFieldCurve(influence: number): number {
  const clamped = Math.min(1, Math.max(0, influence));
  const smooth = clamped * clamped * (3 - 2 * clamped);
  return smooth * smooth;
}

export function resolveDotFieldPull(distance: number, radiusPx: number, maxPullPx = DOT_GRID_MAX_PULL_PX): number {
  return resolveDotFieldCurve(resolveDotFieldInfluence(distance, radiusPx)) * maxPullPx;
}

export function resolveDotFieldDotSize(
  distance: number,
  radiusPx: number,
  basePx = DOT_GRID_BASE_DOT_PX,
  maxPx = DOT_GRID_MAX_DOT_PX,
): number {
  const curve = resolveDotFieldCurve(resolveDotFieldInfluence(distance, radiusPx));
  return basePx + curve * (maxPx - basePx);
}

export type DotFieldPointerSample = Readonly<{ x: number; y: number; strength: number }>;

export type DotFieldDotPlacement = Readonly<{ x: number; y: number; size: number }>;

export function resolveDotFieldDotPlacement(
  point: DotGridPoint,
  pointer: DotFieldPointerSample,
  radiusPx = DOT_GRID_FIELD_RADIUS_PX,
): DotFieldDotPlacement {
  if (pointer.strength <= 0 || radiusPx <= 0) {
    return { x: point.x, y: point.y, size: DOT_GRID_BASE_DOT_PX };
  }
  const dx = pointer.x - point.x;
  const dy = pointer.y - point.y;
  const distance = Math.hypot(dx, dy);
  if (distance >= radiusPx) {
    return { x: point.x, y: point.y, size: DOT_GRID_BASE_DOT_PX };
  }
  const curve = resolveDotFieldCurve(resolveDotFieldInfluence(distance, radiusPx) * pointer.strength);
  const pull = curve * DOT_GRID_MAX_PULL_PX;
  const unitX = distance > 0 ? dx / distance : 0;
  const unitY = distance > 0 ? dy / distance : 0;
  return {
    x: point.x + unitX * pull,
    y: point.y + unitY * pull,
    size: DOT_GRID_BASE_DOT_PX + curve * (DOT_GRID_MAX_DOT_PX - DOT_GRID_BASE_DOT_PX),
  };
}
