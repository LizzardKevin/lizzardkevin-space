import { useEffect, useRef } from "react";
import {
  buildDotGridPoints,
  DOT_GRID_FIELD_RADIUS_PX,
  DOT_GRID_FIELD_SPACING_PX,
  resolveDotFieldDotPlacement,
  type DotGridPoint,
} from "./dotGridField.ts";

const DOT_GRID_CANVAS_MAX_DPR = 1.75;
const DOT_GRID_POINTER_LERP = 0.22;
const DOT_GRID_STRENGTH_LERP = 0.14;
const DOT_GRID_ACTIVATION_MARGIN_PX = 48;

function isDotFieldSettled(current: number, target: number) {
  return Math.abs(target - current) < 0.3;
}

export function DotGridCanvas({
  color,
  spacing = DOT_GRID_FIELD_SPACING_PX,
  fieldRadiusPx = DOT_GRID_FIELD_RADIUS_PX,
}: {
  color: string;
  spacing?: number;
  fieldRadiusPx?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let points: DotGridPoint[] = [];
    let frame: number | null = null;
    let targetX = -9999;
    let targetY = -9999;
    let targetStrength = 0;
    let currentX = -9999;
    let currentY = -9999;
    let currentStrength = 0;

    const draw = () => {
      context.clearRect(0, 0, width, height);
      if (width <= 0 || height <= 0) return;
      const radius = Math.min(fieldRadiusPx, Math.max(width, height) * 0.6);
      context.fillStyle = color;
      for (const point of points) {
        const placement = resolveDotFieldDotPlacement(
          point,
          { x: currentX, y: currentY, strength: currentStrength },
          radius,
        );
        context.fillRect(
          placement.x - placement.size / 2,
          placement.y - placement.size / 2,
          placement.size,
          placement.size,
        );
      }
    };

    const stopLoop = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
    };

    const step = () => {
      currentX += (targetX - currentX) * DOT_GRID_POINTER_LERP;
      currentY += (targetY - currentY) * DOT_GRID_POINTER_LERP;
      currentStrength += (targetStrength - currentStrength) * DOT_GRID_STRENGTH_LERP;
      if (
        isDotFieldSettled(currentX, targetX) &&
        isDotFieldSettled(currentY, targetY) &&
        isDotFieldSettled(currentStrength, targetStrength)
      ) {
        currentX = targetX;
        currentY = targetY;
        currentStrength = targetStrength;
        draw();
        frame = null;
        return;
      }
      draw();
      frame = window.requestAnimationFrame(step);
    };

    const requestLoop = () => {
      if (frame === null && !document.hidden) {
        frame = window.requestAnimationFrame(step);
      }
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, bounds.width);
      const nextHeight = Math.max(1, bounds.height);
      const nextDpr = Math.min(window.devicePixelRatio || 1, DOT_GRID_CANVAS_MAX_DPR);
      if (nextWidth === width && nextHeight === height && nextDpr === dpr) return;
      width = nextWidth;
      height = nextHeight;
      dpr = nextDpr;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      points = buildDotGridPoints(width, height, spacing);
      draw();
    };

    resize();

    if (reducedMotion) {
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      return () => {
        observer.disconnect();
        stopLoop();
      };
    }

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      targetX = x;
      targetY = y;
      const inside =
        x >= -DOT_GRID_ACTIVATION_MARGIN_PX &&
        x <= bounds.width + DOT_GRID_ACTIVATION_MARGIN_PX &&
        y >= -DOT_GRID_ACTIVATION_MARGIN_PX &&
        y <= bounds.height + DOT_GRID_ACTIVATION_MARGIN_PX;
      targetStrength = inside ? 1 : 0;
      requestLoop();
    };

    const handlePointerLeaveWindow = () => {
      targetStrength = 0;
      requestLoop();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else {
        requestLoop();
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", handlePointerLeaveWindow, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeaveWindow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopLoop();
    };
  }, [color, spacing, fieldRadiusPx]);

  return <canvas ref={canvasRef} className="dot-grid-canvas" aria-hidden="true" />;
}
