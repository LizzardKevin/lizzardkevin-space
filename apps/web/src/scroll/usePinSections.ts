import { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useScrollPage } from "./scrollPageContext";
import { prefersReducedMotion } from "./useLenisScroll";

gsap.registerPlugin(ScrollTrigger);

export type PinSectionRule = {
  /** 命中需要 pin 的节（在 root 内 querySelectorAll） */
  selector: string;
  /** pin 停留的滚动距离（视口高度比例或像素字符串，如 "+=40%"） */
  end?: string;
  /** 短于视口此比例的节跳过 pin（默认 0.6） */
  minHeightRatio?: number;
};

/**
 * 专题吸附：命中节在进入视口顶部时 pin 一段滚动距离，
 * 期间滚动条照常前进、画面短暂停留（用户需求：非线性滚动）。
 * pinSpacing 占位保持文档流，scrollspy/锚点不受影响。
 * reduced-motion 或无 scroller 时全部跳过（自然流）。
 */
export function usePinSections(rules: PinSectionRule[], deps: readonly unknown[] = []) {
  const { scroller } = useScrollPage();

  useLayoutEffect(() => {
    if (!scroller || prefersReducedMotion() || rules.length === 0) return undefined;

    const triggers: ScrollTrigger[] = [];
    const created = gsap.context(() => {
      for (const rule of rules) {
        const minRatio = rule.minHeightRatio ?? 0.6;
        const sections = scroller.querySelectorAll<HTMLElement>(rule.selector);
        sections.forEach((section) => {
          if (section.offsetHeight < scroller.clientHeight * minRatio) return;
          triggers.push(
            ScrollTrigger.create({
              trigger: section,
              scroller,
              start: "top top+=88",
              end: rule.end ?? "+=40%",
              pin: true,
              pinSpacing: true,
              anticipatePin: 1,
            }),
          );
        });
      }
    }, scroller);

    return () => {
      triggers.forEach((trigger) => trigger.kill());
      created.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps 由调用方声明（数据就绪后再建 pin）
  }, [scroller, ...deps]);
}
