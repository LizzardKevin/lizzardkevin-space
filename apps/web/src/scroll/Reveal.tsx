import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useScrollPage } from "./scrollPageContext";
import { prefersReducedMotion } from "./useLenisScroll";

gsap.registerPlugin(ScrollTrigger);

/**
 * 滚动进入视口时的 reveal 包装（fade + 上移）。
 * reduced-motion：跳过动画，内容直接静态呈现。
 */
export function Reveal({
  children,
  className,
  y = 28,
  delay = 0,
  start = "top 88%",
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scroller } = useScrollPage();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !scroller || prefersReducedMotion()) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.9,
          delay,
          ease: "power3.out",
          scrollTrigger: { trigger: el, scroller, start, once: true },
        },
      );
    }, el);
    return () => ctx.revert();
  }, [scroller, y, delay, start]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
