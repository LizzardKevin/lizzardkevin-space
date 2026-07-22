import { useEffect, useMemo, useState, type RefObject } from "react";

/**
 * 横向画廊的拖拽滚动（pointer capture + 拖动中禁用 scroll-snap）。
 *
 * 注意：详情页首渲染是 loading 分支，画廊轨道要等数据就绪后才挂载。
 * 若沿用 useRef + 空依赖 effect，effect 运行时 ref.current 仍为 null，
 * 监听永远不会挂上。这里返回带 setter 的 RefObject，把 React 的
 * ref 挂载/卸载转成 state，驱动 effect 在元素出现时重新绑定。
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
    let suppressClickUntil = 0;
    let startX = 0;
    let startScrollLeft = 0;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      moved = false;
      startX = event.clientX;
      startScrollLeft = el.scrollLeft;
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
      el.scrollLeft = startScrollLeft - dx;
    };
    const endDrag = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      delete el.dataset.dragging;
      // 拖拽松手后紧跟的同手势 click 会误触图片 lightbox——350ms 窗口内吞掉，
      // 之后的正常点图不受影响。
      if (moved) suppressClickUntil = Date.now() + 350;
      if (el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId);
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
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, [el]);

  return ref;
}
