import { useEffect, useMemo } from "react";
import type { OverlayTab } from "./OverlayState";
import { LizzardKevinPage } from "../pages/LizzardKevinPage";
import { DevStoriesPage } from "../pages/DevStoriesPage";
import { useFocusDoubleClickHandler } from "../exhibits/focusDoubleClick";

export function OverlayLayer({
  tab,
  closing,
  onRequestClose,
  onClosed,
}: {
  tab: OverlayTab;
  closing: boolean;
  onRequestClose: () => void;
  onClosed: () => void;
}) {
  const handleBlankDoubleClick = useFocusDoubleClickHandler(onRequestClose);

  useEffect(() => {
    if (!tab) return;
    if (!closing) return;
    const t = window.setTimeout(() => onClosed(), 260);
    return () => window.clearTimeout(t);
  }, [closing, onClosed, tab]);

  useEffect(() => {
    if (!tab) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRequestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tab, onRequestClose]);

  const content = useMemo(() => {
    if (tab === "lizzardkevin") return <LizzardKevinPage />;
    if (tab === "devStories") return <DevStoriesPage />;
    return null;
  }, [tab]);

  if (!tab) return null;

  const easing = "cubic-bezier(0.2, 0.9, 0.2, 1)";
  const anim = closing
    ? `overlayRise 260ms ${easing} forwards`
    : `overlayDrop 260ms ${easing} both`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-describedby="overlay-exit-hint"
      className="overlay-layer"
      onClick={handleBlankDoubleClick}
    >
      <div className="overlay-layer__panel" style={{ animation: anim }} onClick={(e) => e.stopPropagation()}>
        {content}
      </div>

      <p id="overlay-exit-hint" className="overlay-exit-hint">
        双击空白区域以退出
      </p>

      <style>{`
        @keyframes overlayDrop {
          from { transform: translateY(-18px); opacity: 0; }
          to { transform: translateY(0px); opacity: 1; }
        }
        @keyframes overlayRise {
          from { transform: translateY(0px); opacity: 1; }
          to { transform: translateY(-18px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
