import {
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { LiquidGlass } from "@khvicha/react-liquid-glass";
import { prefersReducedMotion } from "../scroll/useLenisScroll";

export type ArkGlassTileVariant = "panel" | "link" | "nav";

type ArkGlassTileProps = {
  children: ReactNode;
  className?: string;
  variant?: ArkGlassTileVariant;
};

/** 与 CursorDot 同款跟手阻尼 */
const POINTER_LERP = 0.2;
/** 距边多远（归一化）内高光从满亮衰减到 0 */
const EDGE_FALLOFF = 0.55;

const VARIANT_TINT: Record<ArkGlassTileVariant, string> = {
  panel: "rgba(255, 255, 255, 0.015)",
  link: "rgba(255, 255, 255, 0.012)",
  nav: "rgba(255, 255, 255, 0.012)",
};

/** 空闲白边；悬停高光由 CSS FX 负责，不画在边框上 */
const VARIANT_BORDER: Record<ArkGlassTileVariant, string> = {
  panel: "rgba(255, 255, 255, 0.42)",
  link: "rgba(255, 255, 255, 0.42)",
  nav: "rgba(255, 255, 255, 0.42)",
};

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

function edgeStrength(distanceFromEdge: number) {
  return clamp01(1 - distanceFromEdge / EDGE_FALLOFF);
}

/**
 * 舟味克制工业玻璃贴：
 * - 空闲：近透明 + 白边，无高光
 * - 悬停：贴边高光按离指针距离变亮（贴在内缘，不外扩）
 * - 悬停：框内强调色光晕，lerp 阻尼与 CursorDot 一致，overflow 裁切
 */
export function ArkGlassTile({
  children,
  className,
  variant = "panel",
}: ArkGlassTileProps) {
  const reduceMotion = prefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const hotRef = useRef(false);
  const targetRef = useRef({ x: 0.5, y: 0.5 });
  const currentRef = useRef({ x: 0.5, y: 0.5 });
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduceMotion) return undefined;

    const write = (x: number, y: number) => {
      const el = rootRef.current;
      if (!el) return;
      el.style.setProperty("--ark-glass-mx", `${x * 100}%`);
      el.style.setProperty("--ark-glass-my", `${y * 100}%`);
      el.style.setProperty("--ark-glass-edge-t", String(edgeStrength(y)));
      el.style.setProperty("--ark-glass-edge-b", String(edgeStrength(1 - y)));
      el.style.setProperty("--ark-glass-edge-l", String(edgeStrength(x)));
      el.style.setProperty("--ark-glass-edge-r", String(edgeStrength(1 - x)));
    };

    const step = () => {
      const target = targetRef.current;
      const current = currentRef.current;
      current.x += (target.x - current.x) * POINTER_LERP;
      current.y += (target.y - current.y) * POINTER_LERP;
      write(current.x, current.y);

      if (
        Math.abs(target.x - current.x) < 0.001 &&
        Math.abs(target.y - current.y) < 0.001
      ) {
        current.x = target.x;
        current.y = target.y;
        write(current.x, current.y);
        frameRef.current = null;
        return;
      }
      frameRef.current = window.requestAnimationFrame(step);
    };

    const ensureTick = () => {
      if (frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(step);
      }
    };

    const root = rootRef.current;
    if (!root) return undefined;

    const onEnter = (event: PointerEvent) => {
      hotRef.current = true;
      root.dataset.hot = "true";
      const rect = root.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const x = clamp01((event.clientX - rect.left) / rect.width);
        const y = clamp01((event.clientY - rect.top) / rect.height);
        targetRef.current = { x, y };
        currentRef.current = { x, y };
        write(x, y);
      }
      ensureTick();
    };

    const onMove = (event: PointerEvent) => {
      if (!hotRef.current) return;
      const rect = root.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      targetRef.current = {
        x: clamp01((event.clientX - rect.left) / rect.width),
        y: clamp01((event.clientY - rect.top) / rect.height),
      };
      ensureTick();
    };

    const onLeave = () => {
      hotRef.current = false;
      delete root.dataset.hot;
    };

    root.addEventListener("pointerenter", onEnter);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    return () => {
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [reduceMotion]);

  return (
    <div
      ref={rootRef}
      className={["ark-glass-tile", className].filter(Boolean).join(" ")}
    >
      <LiquidGlass
        className="ark-glass-tile__surface"
        contentClassName="ark-glass-tile__pad"
        blur={1}
        tint={VARIANT_TINT[variant]}
        borderColor={VARIANT_BORDER[variant]}
        borderWidth={1}
        borderRadius={0}
        enableShadow={false}
        enableGlassEffect={false}
        shadowBlur={0}
        shadowSpread={0}
        shadowOffsetX={0}
        shadowOffsetY={0}
        shadowColor="transparent"
        shadowHighlightColor="transparent"
        enableBorderAnimation={false}
        enableClickAnimation={false}
        parallaxMovement={0}
        turbulenceFrequency={0.008}
        turbulenceOctaves={1}
        blurStdDeviation={1}
        displacementScale={0}
        surfaceScale={1}
      >
        {children}
      </LiquidGlass>
      <span className="ark-glass-tile__fx" aria-hidden="true">
        <span className="ark-glass-tile__glow" />
        <span className="ark-glass-tile__edge ark-glass-tile__edge--t" />
        <span className="ark-glass-tile__edge ark-glass-tile__edge--r" />
        <span className="ark-glass-tile__edge ark-glass-tile__edge--b" />
        <span className="ark-glass-tile__edge ark-glass-tile__edge--l" />
      </span>
    </div>
  );
}
