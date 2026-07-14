type PointerLockDocument = Pick<Document, "getElementById">;

export function resolveSpacePointerLockTarget(
  canvas: HTMLElement | null = null,
  documentRoot: PointerLockDocument = document,
) {
  return canvas ?? documentRoot.getElementById("space-canvas");
}
