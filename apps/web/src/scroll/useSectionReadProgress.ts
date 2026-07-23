import { useLayoutEffect } from "react";
import { prefersReducedMotion } from "./useLenisScroll";
import { gsap } from "./scrollGsap";

/**
 * 章节 sticky 轨读进度：随分节滚过把 --ark-rail-progress 从弱到满。
 * sectionSelector 命中分节根；barSelector 命中轨上进度条。
 */
export function useSectionReadProgress(
  sectionSelector: string,
  barSelector: string,
  deps: readonly unknown[] = [],
) {
  useLayoutEffect(() => {
    const scroller = document.querySelector<HTMLElement>(".ark-scroll");
    if (!scroller || prefersReducedMotion()) return undefined;

    const sections = scroller.querySelectorAll<HTMLElement>(sectionSelector);
    if (sections.length === 0) return undefined;

    const ctx = gsap.context(() => {
      sections.forEach((section) => {
        const bar = section.querySelector<HTMLElement>(barSelector);
        if (!bar) return;
        gsap.set(bar, { "--ark-rail-progress": 0.12 });
        gsap.to(bar, {
          "--ark-rail-progress": 1,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            scroller,
            start: "top 72%",
            end: "bottom 36%",
            scrub: true,
          },
        });
      });
    }, scroller);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps 由调用方声明
  }, deps);
}
