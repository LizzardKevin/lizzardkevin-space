import gsap from "gsap";
import { prefersReducedMotion } from "./useLenisScroll";

/**
 * 舟味色块横扫转场（profile ↔ devstories 互切）。
 * 两段式：startWipe() 播扫入（双色块错位横扫覆盖视口）→ 调用方 navigate →
 * 新页面壳层 mount 时 playWipeOutIfPending() 播扫出。
 * 方向与切换的空间逻辑一致：向右切换（01→02）面板从右扫入、向左掀开；
 * 向左切换（02→01）反之。跨页状态用模块级标记（SPA 内 module 单例随路由存活）。
 */

export type WipeDirection = "left" | "right";

let wipeOutPending: WipeDirection | null = null;

/** 播扫入动画；resolve 于覆盖完成、可以安全 navigate 的时刻。 */
export function startWipe(container: HTMLElement, direction: WipeDirection): Promise<void> {
  if (prefersReducedMotion()) {
    wipeOutPending = null;
    return Promise.resolve();
  }
  const panels = container.querySelectorAll<HTMLElement>(".ark-wipe__panel");
  if (panels.length === 0) return Promise.resolve();

  const from = direction === "right" ? 101 : -101;

  return new Promise((resolve) => {
    gsap
      .timeline({
        onComplete: () => {
          wipeOutPending = direction;
          resolve();
        },
      })
      .set(container, { autoAlpha: 1 })
      .fromTo(
        panels,
        { xPercent: from },
        { xPercent: 0, duration: 0.42, ease: "power3.inOut", stagger: 0.06 },
      );
  });
}

/** 新页面壳层挂载后调用；若处于转场中则播扫出并清除标记。 */
export function playWipeOutIfPending(container: HTMLElement) {
  if (wipeOutPending === null) return;
  const direction = wipeOutPending;
  wipeOutPending = null;
  const panels = container.querySelectorAll<HTMLElement>(".ark-wipe__panel");
  if (panels.length === 0) {
    gsap.set(container, { autoAlpha: 0 });
    return;
  }
  const exitTo = direction === "right" ? -101 : 101;
  const resetTo = direction === "right" ? 101 : -101;
  gsap
    .timeline()
    .to(panels, {
      xPercent: exitTo,
      duration: 0.38,
      ease: "power3.inOut",
      stagger: 0.06,
      delay: 0.05,
    })
    .set(container, { autoAlpha: 0 })
    .set(panels, { xPercent: resetTo });
}
