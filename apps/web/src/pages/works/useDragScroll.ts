import { useEffect, useMemo, useState, type RefObject } from "react";

/**
 * 横向画廊的拖拽滚动：拖拽 + 惯性滑移。
 *
 * - 拖拽：pointer 位移直写 scrollLeft（>4px 才 setPointerCapture，
 *   让未拖动的点击正常落在图片上触发 lightbox）。
 * - 惯性：松手时按近期速度继续滑移，指数衰减；再按下立即停。
 * - 不使用 scroll-snap（用户要求停止时不定格到特定位置）。
 * - 拖拽松手后 350ms 窗口内吞掉同手势 click，避免误开 lightbox。
 *
 * 挂载时序：详情页首渲染是 loading 分支，画廊轨道等数据就绪后才挂载。
 * 返回带 setter 的 RefObject，把 React 的 ref 挂载/卸载转成 state，
 * 驱动 effect 在元素出现时重新绑定。
 */
export function useDragScroll<T extends HTMLElement>(): RefObject<T | null> {
  const [el, setEl] = useState<T | null>(null);
  const ref = useMemo<RefObject<T | null>>(() => {
    let current: T | null = null;
    return {
      get current() {
        return current;
      },
      set current(node: T | null) {
        if (node === current) return;
        current = node;
        setEl(node);
      },
    };
  }, []);

  useEffect(() => {
    if (!el) return undefined;

    let dragging = false;
    let moved = false;
    let startX = 0;
    let startScrollLeft = 0;
    let lastMoveAt = 0;
    let velocity = 0; // px/ms，正 = 内容向左（scrollLeft 增大）
    let momentumFrame: number | null = null;
    let suppressClickUntil = 0;

    const stopMomentum = () => {
      if (momentumFrame !== null) {
        window.cancelAnimationFrame(momentumFrame);
        momentumFrame = null;
      }
    };

    const startMomentum = (initialVelocity: number) => {
      stopMomentum();
      let v = initialVelocity;
      let lastAt = performance.now();
      const step = (now: number) => {
        const dt = Math.min(now - lastAt, 50);
        lastAt = now;
        el.scrollLeft += v * dt;
        v *= Math.pow(0.94, dt / 16.7);
        const atStart = el.scrollLeft <= 0 && v < 0;
        const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1 && v > 0;
        if (Math.abs(v) > 0.08 && !atStart && !atEnd) {
          momentumFrame = window.requestAnimationFrame(step);
        } else {
          momentumFrame = null;
        }
      };
      momentumFrame = window.requestAnimationFrame(step);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      stopMomentum();
      dragging = true;
      moved = false;
      velocity = 0;
      startX = event.clientX;
      startScrollLeft = el.scrollLeft;
      lastMoveAt = event.timeStamp;
      // 注意：不能在此 setPointerCapture——capture 会把后续 click 重定向到
      // 轨道本身，图片的 onClick（lightbox）就收不到。等到真拖动再 capture。
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - startX;
      if (Math.abs(dx) > 4 && !moved) {
        moved = true;
        el.dataset.dragging = "true";
        if (el.hasPointerCapture(event.pointerId) === false) {
          el.setPointerCapture(event.pointerId);
        }
      }
      if (!moved) return;
      const nextScrollLeft = startScrollLeft - dx;
      const dt = event.timeStamp - lastMoveAt;
      if (dt > 0) {
        // 指数平滑近期速度，松手时用作惯性初速
        velocity = velocity * 0.7 + ((nextScrollLeft - el.scrollLeft) / dt) * 0.3;
        lastMoveAt = event.timeStamp;
      }
      el.scrollLeft = nextScrollLeft;
    };
    const endDrag = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      delete el.dataset.dragging;
      if (el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId);
      }
      if (moved) {
        suppressClickUntil = Date.now() + 350;
        if (Math.abs(velocity) > 0.15) {
          startMomentum(velocity);
        }
      }
    };
    const onClickCapture = (event: MouseEvent) => {
      if (Date.now() >= suppressClickUntil) return;
      suppressClickUntil = 0;
      event.preventDefault();
      event.stopPropagation();
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("click", onClickCapture, true);
    return () => {
      stopMomentum();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, [el]);

  return ref;
}
