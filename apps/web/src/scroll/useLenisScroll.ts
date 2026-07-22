import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * 页面级 Lenis 平滑滚动：挂在壳层滚动容器上，与 ScrollTrigger 联动。
 * reduced-motion 用户不启用（退回原生滚动）。
 */
export function useLenisScroll(
  wrapper: HTMLElement | null,
  content: HTMLElement | null,
) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!wrapper || !content || prefersReducedMotion()) return undefined;

    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.05,
      smoothWheel: true,
      touchMultiplier: 1.4,
    });
    lenisRef.current = lenis;
    lenis.on("scroll", ScrollTrigger.update);

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [wrapper, content]);

  return lenisRef;
}
