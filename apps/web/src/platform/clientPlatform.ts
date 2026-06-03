import { PLATFORM_FEATURES } from "./platformConfig";

export type ClientPlatform = "desktop" | "mobile";
/** 预留：| "tablet" */

/**
 * 粗指针且无精细指针 → 手机等触控主设备；
 * iPad + 鼠标/触控板/未来虚拟摇杆 → desktop（fine pointer 存在）。
 */
export function detectClientPlatform(): ClientPlatform {
  if (typeof window === "undefined") return "desktop";

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;

  if (coarse && !fine) return "mobile";

  if (PLATFORM_FEATURES.enableTabletSpace && fine) {
    const landscape = window.matchMedia("(orientation: landscape)").matches;
    const wide = window.matchMedia(`(min-width: ${PLATFORM_FEATURES.tabletMinWidth}px)`).matches;
    if (landscape && wide) return "desktop";
  }

  return "desktop";
}
