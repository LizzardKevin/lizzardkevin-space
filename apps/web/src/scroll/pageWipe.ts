import gsap from "gsap";
import { prefersReducedMotion } from "./useLenisScroll";

/**
 * 舟味色块横扫转场（profile ↔ devstories 互切）。
 * 两段式：startWipe() 播扫入（双色块错位横扫覆盖视口）→ 调用方 navigate →
 * 新页面壳层 mount 时 playWipeOutIfPending() 播扫出，同时新内容从同侧
 * 短距滑入（接力感，避免硬切）。
 * 方向与切换的空间逻辑一致：向右切换（profile→devstories）面板从右扫入、
 * 向左掀开，新内容从右入；向左切换反之。
 * 跨页状态用模块级标记（SPA 内 module 单例随路由存活）。
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
        { xPercent: 0, duration: 0.26, ease: "power3.inOut", stagger: 0.045 },
      );
  });
}

/** 新页面壳层挂载后调用；若处于转场中则播扫出 + 内容接力滑入。
 *  关键：先把面板钉回全覆盖位（新页面板初始在屏外，直接扫出会闪露），
 *  并延后两帧让目标页首帧渲染完成——先盖全，再放。 */
export function playWipeOutIfPending(container: HTMLElement, content?: HTMLElement | null) {
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
  const contentFromX = direction === "right" ? 56 : -56;

  const timeline = gsap.timeline();
  // 面板钉回全覆盖位（视觉无缝衔接上一页的扫入终态）
  timeline.set(container, { autoAlpha: 1 });
  timeline.set(panels, { xPercent: 0 });
  // 等目标页首帧渲染（约 2 帧）再释放扫出
  timeline.to(panels, {
    xPercent: exitTo,
    duration: 0.24,
    ease: "power3.inOut",
    stagger: 0.045,
    delay: 0.09,
  });
  if (content) {
    timeline.fromTo(
      content,
      { x: contentFromX, autoAlpha: 0.4 },
      { x: 0, autoAlpha: 1, duration: 0.34, ease: "power3.out", clearProps: "x,opacity,visibility" },
      0.17,
    );
  }
  timeline.set(container, { autoAlpha: 0 }).set(panels, { xPercent: resetTo });
}
