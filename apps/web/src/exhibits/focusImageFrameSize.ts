export type FocusImageFrameSize = {
  normalWidth: number;
  normalHeight: number;
  expandedWidth: number;
  expandedHeight: number;
};

type FocusImageFrameSizeInput = {
  naturalWidth: number;
  naturalHeight: number;
  stageWidth: number;
  stageHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  topSafe: number;
  bottomSafe: number;
};

function resolveFocusCssLengthTokenPx(token: string, viewportHeight: number) {
  const value = token.trim();
  const pxMatch = value.match(/^(-?\d+(?:\.\d+)?)px$/);
  if (pxMatch) return Number(pxMatch[1]);
  const vhMatch = value.match(/^(-?\d+(?:\.\d+)?)vh$/);
  if (vhMatch) return (Number(vhMatch[1]) / 100) * viewportHeight;
  return null;
}

export function resolveFocusSafeAreaPx(
  cssValue: string | null | undefined,
  viewportHeight: number,
  fallbackPx: number,
) {
  if (!cssValue) return fallbackPx;
  const direct = resolveFocusCssLengthTokenPx(cssValue, viewportHeight);
  if (direct !== null) return direct;

  const clampMatch = cssValue
    .trim()
    .match(/^clamp\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)$/);
  if (!clampMatch) return fallbackPx;

  const min = resolveFocusCssLengthTokenPx(clampMatch[1], viewportHeight);
  const preferred = resolveFocusCssLengthTokenPx(clampMatch[2], viewportHeight);
  const max = resolveFocusCssLengthTokenPx(clampMatch[3], viewportHeight);
  if (min === null || preferred === null || max === null) return fallbackPx;
  return Math.min(Math.max(preferred, min), max);
}

export function resolveFocusImageFrameSize({
  naturalWidth,
  naturalHeight,
  stageWidth,
  stageHeight,
  viewportWidth,
  viewportHeight,
  topSafe,
  bottomSafe,
}: FocusImageFrameSizeInput): FocusImageFrameSize {
  const aspect = naturalWidth / naturalHeight;
  const stageGutter = 48;
  const maxStageWidth = Math.max(120, stageWidth - stageGutter);
  const maxWidth = Math.min(1040, viewportWidth * 0.74, maxStageWidth);
  const maxHeight = Math.max(120, stageHeight - topSafe - bottomSafe);
  let normalWidth = maxWidth;
  let normalHeight = normalWidth / aspect;

  if (normalHeight > maxHeight) {
    normalHeight = maxHeight;
    normalWidth = normalHeight * aspect;
  }

  const targetExpandedArea = viewportWidth * viewportHeight * 0.6;
  const maxExpandedWidth = viewportWidth * 0.9;
  const maxExpandedHeight = viewportHeight * 0.86;
  let expandedWidth = Math.sqrt(targetExpandedArea * aspect);
  let expandedHeight = expandedWidth / aspect;

  if (expandedWidth > maxExpandedWidth) {
    expandedWidth = maxExpandedWidth;
    expandedHeight = expandedWidth / aspect;
  }

  if (expandedHeight > maxExpandedHeight) {
    expandedHeight = maxExpandedHeight;
    expandedWidth = expandedHeight * aspect;
  }

  return {
    normalWidth: Math.round(normalWidth),
    normalHeight: Math.round(normalHeight),
    expandedWidth: Math.round(expandedWidth),
    expandedHeight: Math.round(expandedHeight),
  };
}
