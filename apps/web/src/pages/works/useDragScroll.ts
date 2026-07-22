import { useEffect, useRef } from "react";

/** 横向画廊的拖拽滚动（pointer capture + 拖动中禁用 scroll-snap）。 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    let dragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      startX = event.clientX;
      startScrollLeft = el.scrollLeft;
      el.setPointerCapture(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - startX;
      if (Math.abs(dx) > 4) el.dataset.dragging = "true";
      el.scrollLeft = startScrollLeft - dx;
    };
    const endDrag = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      delete el.dataset.dragging;
      if (el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId);
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
    };
  }, []);

  return ref;
}
