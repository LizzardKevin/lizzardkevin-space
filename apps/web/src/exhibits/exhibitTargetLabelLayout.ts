export type ExhibitLabelScreenPoint = {
  x: number;
  y: number;
};

export type ExhibitLabelViewport = {
  width: number;
  height: number;
};

export type ExhibitLabelSize = {
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.max(min, Math.min(max, value));
}

export function clampExhibitLabelScreenPoint(
  point: ExhibitLabelScreenPoint,
  viewport: ExhibitLabelViewport,
  paddingPx: number,
  labelSize: ExhibitLabelSize = { width: 0, height: 0 },
): ExhibitLabelScreenPoint {
  const halfWidth = labelSize.width / 2;
  const halfHeight = labelSize.height / 2;

  return {
    x: clamp(point.x, paddingPx + halfWidth, viewport.width - paddingPx - halfWidth),
    y: clamp(point.y, paddingPx + halfHeight, viewport.height - paddingPx - halfHeight),
  };
}
