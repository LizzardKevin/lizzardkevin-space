type PointerLockDocument = Pick<Document, "getElementById">;

export const SPACE_POINTER_LOCK_TARGET_ID = "space-pointer-lock-target";

export function resolveSpacePointerLockTarget(
  fallback: HTMLElement | null = null,
  documentRoot: PointerLockDocument = document,
) {
  return documentRoot.getElementById(SPACE_POINTER_LOCK_TARGET_ID) ?? fallback;
}

export function isSpacePointerLockActive(
  expectedTarget: Pick<Element, "id"> | null,
  activeElement: Pick<Element, "id"> | null = document.pointerLockElement,
) {
  if (!expectedTarget || !activeElement) return false;
  return (
    activeElement === expectedTarget ||
    (activeElement.id === SPACE_POINTER_LOCK_TARGET_ID &&
      expectedTarget.id === SPACE_POINTER_LOCK_TARGET_ID)
  );
}
