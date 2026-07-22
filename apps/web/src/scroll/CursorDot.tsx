import { useEffect, useRef } from "react";

/**
 * 圆点光标（与 SPACE 的自定义指针同一语言）：
 * 隐藏系统光标（CSS 层），6px 圆点 lerp 跟随，hover 交互元素时放大成环。
 * reduced-motion 不启用（保留系统光标）。
 */
export function CursorDot() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    if (!dot) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dot.style.display = "none";
      return undefined;
    }

    document.documentElement.classList.add("ark-cursor-none");
    let frame: number | null = null;
    let targetX = -100;
    let targetY = -100;
    let x = -100;
    let y = -100;

    const write = () => {
      dot.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -50%)`;
    };
    const step = () => {
      x += (targetX - x) * 0.2;
      y += (targetY - y) * 0.2;
      write();
      if (Math.abs(targetX - x) < 0.5 && Math.abs(targetY - y) < 0.5) {
        x = targetX;
        y = targetY;
        write();
        frame = null;
        return;
      }
      frame = window.requestAnimationFrame(step);
    };
    const onMove = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      dot.dataset.visible = "true";
      if (frame === null) frame = window.requestAnimationFrame(step);
    };
    const onOver = (event: PointerEvent) => {
      const interactive =
        event.target instanceof Element &&
        event.target.closest("a, button, [role='button'], .ark-wgallery__track, .ark-wstage");
      dot.dataset.hover = interactive ? "true" : "false";
    };
    const onLeave = () => {
      dot.dataset.visible = "false";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      document.documentElement.classList.remove("ark-cursor-none");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="ark-cursor-dot" ref={dotRef} aria-hidden="true" />;
}
