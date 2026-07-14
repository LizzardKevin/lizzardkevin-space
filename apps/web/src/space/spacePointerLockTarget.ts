type PointerLockDocument = Pick<Document, "getElementById">;

export function resolveSpacePointerLockTarget(
  canvas: HTMLElement | null = null,
  documentRoot: PointerLockDocument = document,
) {
  return canvas ?? documentRoot.getElementById("space-canvas");
}

export function isSpacePointerLockActive(
  expectedCanvas: Pick<Element, "id"> | null,
  activeElement: Pick<Element, "id"> | null = document.pointerLockElement,
) {
  if (!expectedCanvas || !activeElement) return false;
  return (
    activeElement === expectedCanvas ||
    (activeElement.id === "space-canvas" && expectedCanvas.id === "space-canvas")
  );
}
