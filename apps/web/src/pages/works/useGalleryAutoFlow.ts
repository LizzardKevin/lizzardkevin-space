import { useEffect, useState, type RefObject } from "react";
import { prefersReducedMotion } from "../../scroll/useLenisScroll";
import {
  WORK_GALLERY_FLOW_SPEED_PX_S,
  resolveGalleryCopyCount,
  wrapGalleryScrollLeft,
} from "./workGalleryFlow";
import type { DragScrollInteraction } from "./useDragScroll";

/**
 * 图集轨道自动流(marquee):缓慢恒速横向滚动,内容复制实现无缝循环。
 *
 * - 暂停条件:hover(仅 hover 能力指针)、拖拽中、惯性滑移中、页面不可见、
 *   lightbox 打开(paused);惯性结束自动恢复。
 * - 只在没有用户交互时推进 scrollLeft,与 useDragScroll 的写入不打架;
 *   环绕周期经 wrapPeriodRef 回流给拖拽 hook,拖拽/惯性写入同样无缝。
 * - reduced-motion 与 dev 钩子 ?wpGalleryFlow=0 下完全关闭:内容不复制、
 *   不自动推进,退化为静态可拖拽轨道。
 */

/** dev 钩子:?wpGalleryFlow=0 关闭自动流(仅 DEV 生效)。 */
function isFlowDisabledByQuery(): boolean {
  return (
    Boolean(import.meta.env.DEV) &&
    new URLSearchParams(window.location.search).get("wpGalleryFlow") === "0"
  );
}

/** 单份内容宽度 = 第 itemCount 个子项与首个子项的 offsetLeft 差(含 flex gap)。 */
export function measureGallerySetWidth(track: HTMLElement, itemCount: number): number {
  const first = track.children[0];
  const marker = track.children[itemCount];
  if (!(first instanceof HTMLElement) || !(marker instanceof HTMLElement)) return 0;
  return marker.offsetLeft - first.offsetLeft;
}

export type UseGalleryAutoFlowOptions = Readonly<{
  trackRef: RefObject<HTMLElement | null>;
  /** 单份图片数(<2 时自动流不启用) */
  itemCount: number;
  /** useDragScroll 暴露的拖拽/惯性状态 */
  interaction: DragScrollInteraction;
  /** lightbox 打开等外部暂停 */
  paused: boolean;
  /** 测得的环绕周期(px)回流给 useDragScroll 的 getWrapPeriod */
  wrapPeriodRef: RefObject<number>;
}>;

/** 返回应渲染的内容份数(自动流关闭时为 1,即不复制)。 */
export function useGalleryAutoFlow({
  trackRef,
  itemCount,
  interaction,
  paused,
  wrapPeriodRef,
}: UseGalleryAutoFlowOptions): number {
  const flowEnabled =
    itemCount >= 2 && !prefersReducedMotion() && !isFlowDisabledByQuery();
  const [measuredCopies, setMeasuredCopies] = useState(2);

  useEffect(() => {
    if (!flowEnabled) {
      wrapPeriodRef.current = 0;
      return undefined;
    }

    let rafId = 0;
    let period = 0;
    let lastAt = performance.now();
    let lastMeasureAt = -Infinity;
    // 位置在 JS 侧按分数累计:32px/s 的帧增量 <0.5px,浏览器可能把
    // scrollLeft 取整存储,每帧读改写会把分数部分截掉,流速被拖没
    let position = -1;
    let lastWritten = 0;
    // 触屏的粘性 :hover 会误暂停;hover 暂停只对精确的鼠标类指针生效
    const hoverPointer = window.matchMedia("(hover: hover) and (pointer: fine)");

    const step = (now: number) => {
      rafId = window.requestAnimationFrame(step);
      const el = trackRef.current;
      if (!el) {
        lastAt = now;
        return;
      }
      // 周期低频复测:视口缩放/换展品/字体落地都会改变单份宽度
      if (period <= 0 || now - lastMeasureAt >= 500) {
        lastMeasureAt = now;
        const measured = measureGallerySetWidth(el, itemCount);
        if (measured > 0 && measured !== period && position >= 0) {
          position = wrapGalleryScrollLeft(position, measured);
        }
        period = measured;
        wrapPeriodRef.current = period;
        if (period > 0) {
          const needed = resolveGalleryCopyCount(el.clientWidth, period);
          setMeasuredCopies((current) => (current === needed ? current : needed));
        }
      }
      const dt = Math.min(now - lastAt, 100);
      lastAt = now;
      if (period <= 0) {
        position = -1;
        return;
      }
      const actual = el.scrollLeft;
      if (position < 0) {
        position = actual;
      } else if (Math.abs(actual - lastWritten) > 1.5) {
        // 拖拽/惯性/原生滚动改写了 scrollLeft → 采纳真实位置接着流
        position = actual;
      }
      if (paused || interaction.dragging || interaction.momentum) {
        position = actual;
        lastWritten = actual;
        return;
      }
      if (document.hidden) return;
      if (hoverPointer.matches && el.matches(":hover")) return;
      position = wrapGalleryScrollLeft(
        position + (WORK_GALLERY_FLOW_SPEED_PX_S * dt) / 1000,
        period,
      );
      el.scrollLeft = position;
      lastWritten = position;
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(rafId);
      wrapPeriodRef.current = 0;
    };
  }, [flowEnabled, trackRef, itemCount, paused, interaction, wrapPeriodRef]);

  return flowEnabled ? measuredCopies : 1;
}
