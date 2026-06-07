import { useCallback, useEffect, useRef } from "react";

import { FOCUS_DOUBLE_CLICK_MS } from "./focusConfig";

/**
 * 用两次 click 判定双击（间隔 ≤ maxIntervalMs），不依赖浏览器 dblclick 默认阈值。
 */
export function useFocusDoubleClickHandler(
  onDoubleClick: () => void,
  maxIntervalMs: number = FOCUS_DOUBLE_CLICK_MS,
): () => void {
  const onActionRef = useRef(onDoubleClick);
  const lastClickAtRef = useRef(0);

  useEffect(() => {
    onActionRef.current = onDoubleClick;
  }, [onDoubleClick]);

  return useCallback(() => {
    const now = performance.now();
    const delta = now - lastClickAtRef.current;
    if (lastClickAtRef.current > 0 && delta <= maxIntervalMs) {
      lastClickAtRef.current = 0;
      onActionRef.current();
      return;
    }
    lastClickAtRef.current = now;
  }, [maxIntervalMs]);
}
