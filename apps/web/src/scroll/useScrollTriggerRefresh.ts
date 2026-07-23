import { useEffect } from "react";
import { ScrollTrigger } from "./scrollGsap";

/**
 * 内容尺寸变化后刷新 ScrollTrigger（字体、hero shrink、scrub、Reveal 等）。
 */
export function useScrollTriggerRefresh(scroller: HTMLElement | null) {
  useEffect(() => {
    if (!scroller) return undefined;

    let cancelled = false;
    const refresh = () => {
      if (!cancelled) ScrollTrigger.refresh();
    };

    void document.fonts.ready.then(refresh);

    const images = scroller.querySelectorAll("img");
    images.forEach((img) => {
      if (img.complete) return;
      img.addEventListener("load", refresh, { once: true });
      img.addEventListener("error", refresh, { once: true });
    });

    const timer = window.setTimeout(refresh, 320);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [scroller]);
}
