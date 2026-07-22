import { createContext, useContext } from "react";

/** 滚动页壳层上下文：提供滚动容器元素（ScrollTrigger scroller）与锚点滚动方法。 */
export type ScrollPageContextValue = {
  scroller: HTMLElement | null;
  scrollToTarget: (target: string | HTMLElement) => void;
};

export const ScrollPageContext = createContext<ScrollPageContextValue>({
  scroller: null,
  scrollToTarget: () => undefined,
});

export function useScrollPage() {
  return useContext(ScrollPageContext);
}
