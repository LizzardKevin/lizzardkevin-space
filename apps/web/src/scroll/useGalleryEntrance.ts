import { useLayoutEffect, type RefObject } from "react";
import { prefersReducedMotion } from "./useLenisScroll";
import { gsap } from "./scrollGsap";

/**
 * 画廊轨道 once 入场：横向滑入 + fade（ScrollTrigger once）。
 */
export function useGalleryEntrance(
  trackRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  deps: readonly unknown[] = [],
) {
  useLayoutEffect(() => {
    const el = trackRef.current;
    const scroller = document.querySelector<HTMLElement>(".ark-scroll");
    if (!enabled || !el || !scroller || prefersReducedMotion()) return undefined;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, x: 28 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            scroller,
            start: "top 88%",
            once: true,
          },
        },
      );
    }, scroller);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps 由调用方声明
  }, [enabled, trackRef, ...deps]);
}
