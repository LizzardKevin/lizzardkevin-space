import { type PointerEvent, type ReactNode, useRef } from "react";
import { LiquidGlass } from "@khvicha/react-liquid-glass";
import { prefersReducedMotion } from "../scroll/useLenisScroll";

export type ArkGlassTileVariant = "panel" | "link" | "nav";

type ArkGlassTileProps = {
  children: ReactNode;
  className?: string;
  variant?: ArkGlassTileVariant;
};

const VARIANT_TINT: Record<ArkGlassTileVariant, string> = {
  panel: "rgba(255, 255, 255, 0.015)",
  link: "rgba(255, 255, 255, 0.012)",
  nav: "rgba(255, 255, 255, 0.012)",
};

const VARIANT_BORDER: Record<ArkGlassTileVariant, string> = {
  panel: "rgba(213, 214, 216, 0.22)",
  link: "rgba(213, 214, 216, 0.18)",
  nav: "rgba(213, 214, 216, 0.22)",
};

function setPointerCssVars(el: HTMLElement, event: PointerEvent<HTMLElement>) {
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  el.style.setProperty("--ark-glass-mx", `${Math.min(100, Math.max(0, x))}%`);
  el.style.setProperty("--ark-glass-my", `${Math.min(100, Math.max(0, y))}%`);
}

/**
 * 舟味克制工业玻璃贴：
 * - 空闲近透明、无光
 * - 悬停：整圈贴边高光常亮（不依赖光标→边缘射线）
 * - 悬停：框内强调色光晕跟随指针，overflow 裁切不溢出
 * 调用方只传 className / variant / children。
 */
export function ArkGlassTile({
  children,
  className,
  variant = "panel",
}: ArkGlassTileProps) {
  const reduceMotion = prefersReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={rootRef}
      className={["ark-glass-tile", className].filter(Boolean).join(" ")}
      onPointerEnter={
        reduceMotion
          ? undefined
          : (event) => {
              setPointerCssVars(event.currentTarget, event);
            }
      }
      onPointerMove={
        reduceMotion
          ? undefined
          : (event) => {
              setPointerCssVars(event.currentTarget, event);
            }
      }
    >
      <LiquidGlass
        className="ark-glass-tile__surface"
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
      <span className="ark-glass-tile__fx" aria-hidden="true" />
    </div>
  );
}
