import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { scrollBusJumpTo } from "./scrollBus";

// Per history entry: visiting a work again through a new link starts at its hero.
const positions = new Map<string, number>();

export function useRouteScrollPosition(scroller: HTMLElement | null, ready: boolean) {
  const { key } = useLocation();
  const navigationType = useNavigationType();
  const appliedKey = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (!scroller || !ready) return;
    if (appliedKey.current !== key) {
      const position = navigationType === "POP" ? positions.get(key) ?? 0 : 0;
      scrollBusJumpTo(position);
      appliedKey.current = key;
    }
    const record = () => {
      positions.set(key, scroller.scrollTop);
      if (positions.size > 100) positions.delete(positions.keys().next().value!);
    };
    scroller.addEventListener("scroll", record, { passive: true });
    return () => scroller.removeEventListener("scroll", record);
  }, [scroller, ready, key, navigationType]);
}
