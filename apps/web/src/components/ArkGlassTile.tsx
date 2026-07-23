import { type ReactNode } from "react";
import { LiquidGlass } from "@khvicha/react-liquid-glass";
import { prefersReducedMotion } from "../scroll/useLenisScroll";

export type ArkGlassTileVariant = "panel" | "link" | "nav";

type ArkGlassTileProps = {
  children: ReactNode;
  className?: string;
  variant?: ArkGlassTileVariant;
};

const VARIANT_TINT: Record<ArkGlassTileVariant, string> = {
  panel: "rgba(255, 255, 255, 0.06)",
  link: "rgba(255, 255, 255, 0.05)",
  nav: "rgba(255, 255, 255, 0.05)",
};

const VARIANT_BORDER: Record<ArkGlassTileVariant, string> = {
  panel: "rgba(213, 214, 216, 0.22)",
  link: "rgba(213, 214, 216, 0.18)",
  nav: "rgba(213, 214, 216, 0.22)",
};

/**
 * 舟味克制工业玻璃贴：边光跟随指针；禁止点击波纹与 parallax 位移。
 * 调用方只传 className / variant / children，不透出库强度参数。
 */
export function ArkGlassTile({
  children,
  className,
  variant = "panel",
}: ArkGlassTileProps) {
  const reduceMotion = prefersReducedMotion();

  return (
    <LiquidGlass
      className={["ark-glass-tile", className].filter(Boolean).join(" ")}
      blur={8}
      tint={VARIANT_TINT[variant]}
      borderColor={VARIANT_BORDER[variant]}
      borderWidth={1}
      borderRadius={0}
      shadowBlur={0}
      shadowSpread={0}
      shadowOffsetX={0}
      shadowOffsetY={0}
      shadowColor="transparent"
      enableBorderAnimation={!reduceMotion}
      enableClickAnimation={false}
      parallaxMovement={0}
      turbulenceFrequency={0.008}
      turbulenceOctaves={1}
      blurStdDeviation={2}
      displacementScale={40}
      surfaceScale={2}
    >
      {children}
    </LiquidGlass>
  );
}
