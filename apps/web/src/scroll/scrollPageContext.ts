import { createContext, useContext } from "react";

/** 滚动页壳层上下文：提供滚动容器元素（ScrollTrigger scroller）。 */
export type ScrollPageContextValue = {
  scroller: HTMLElement | null;
};

export const ScrollPageContext = createContext<ScrollPageContextValue>({
  scroller: null,
});

export function useScrollPage() {
  return useContext(ScrollPageContext);
}
