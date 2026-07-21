import { useEffect, useRef } from "react";

export const DOT_GRID_SPOTLIGHT_LERP_FACTOR = 0.14;

export function lerpDotGridValue(current: number, target: number, factor = DOT_GRID_SPOTLIGHT_LERP_FACTOR): number {
  return current + (target - current) * factor;
}

export function isDotGridValueSettled(current: number, target: number): boolean {
  return Math.abs(target - current) < 0.4;
}

/**
 * Pointer spotlight driver for industrial dot-grid surfaces.
 * Writes --dot-grid-x / --dot-grid-y (element-relative, lerped) on each
 * registered element via an rAF loop that stops once settled.
 * Disabled under reduced motion: spotlight vars stay at their CSS fallbacks.
 */
export function useDotGridPointer() {
  const elementsRef = useRef<Set<HTMLElement>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const elements = elementsRef.current;
    let frame: number | null = null;
    let targetX = -400;
    let targetY = -400;
    let x = -400;
    let y = -400;

    const writeVars = () => {
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--dot-grid-x", `${Math.round(x - rect.left)}px`);
        el.style.setProperty("--dot-grid-y", `${Math.round(y - rect.top)}px`);
      });
    };

    const step = () => {
      x = lerpDotGridValue(x, targetX);
      y = lerpDotGridValue(y, targetY);
      writeVars();
      if (isDotGridValueSettled(x, targetX) && isDotGridValueSettled(y, targetY)) {
        x = targetX;
        y = targetY;
        writeVars();
        frame = null;
        return;
      }
      frame = window.requestAnimationFrame(step);
    };

    const handlePointerMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      if (frame === null) frame = window.requestAnimationFrame(step);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (el: HTMLElement | null) => {
    if (!el) return undefined;
    elementsRef.current.add(el);
    return () => {
      elementsRef.current.delete(el);
    };
  };
}
