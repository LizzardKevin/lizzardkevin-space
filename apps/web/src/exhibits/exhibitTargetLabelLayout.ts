export type ExhibitLabelScreenPoint = {
  x: number;
  y: number;
};

export type ExhibitLabelViewport = {
  width: number;
  height: number;
};

export function resolveExhibitLabelUiPosition(
  viewport: ExhibitLabelViewport,
  cursorOffsetYPx: number,
): ExhibitLabelScreenPoint {
  return {
    x: Math.round(viewport.width / 2),
    y: Math.round(viewport.height / 2 + cursorOffsetYPx),
  };
}
