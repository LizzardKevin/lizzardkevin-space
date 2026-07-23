import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion } from "./useLenisScroll";

gsap.registerPlugin(ScrollTrigger);

export type ScrubSectionRule = {
  /** 命中需要视差吸附的节（在滚动容器内 querySelectorAll） */
  selector: string;
  /** 纵向视差幅度（px，±值；默认 56）。越大迟滞感越强 */
  drift?: number;
  /** 短于视口此比例的节跳过（默认 0.5） */
  minHeightRatio?: number;
};

/**
 * 专题吸附（视差减速版）：命中节以低于滚动的速度纵向移动
 * （进入视口时偏 +drift、离开时偏 -drift），产生"被拖住"的吸附迟滞，
 * 但始终微动、绝不锁死——替代旧 pin 方案（pin 全锁导致内部
 * sticky 数字轨怪异下移、画面死板）。
 * reduced-motion 时全部跳过。
 */
export function useScrubSections(rules: ScrubSectionRule[], deps: readonly unknown[] = []) {
  useLayoutEffect(() => {
    const scroller = document.querySelector<HTMLElement>(".ark-scroll");
    if (!scroller || prefersReducedMotion() || rules.length === 0) return undefined;

    const ctx = gsap.context(() => {
      for (const rule of rules) {
        const drift = rule.drift ?? 56;
        const minRatio = rule.minHeightRatio ?? 0.5;
        const sections = scroller.querySelectorAll<HTMLElement>(rule.selector);
        sections.forEach((section) => {
          if (section.offsetHeight < scroller.clientHeight * minRatio) return;
          gsap.fromTo(
            section,
            { y: drift },
            {
              y: -drift,
              ease: "none",
              scrollTrigger: {
                trigger: section,
                scroller,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.5,
              },
            },
          );
        });
      }
    }, scroller);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps 由调用方声明（数据就绪后再建）
  }, deps);
}
