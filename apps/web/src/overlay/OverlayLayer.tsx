import { useEffect } from "react";
import type { OverlayTab } from "./OverlayState";
import { FrostedSplitTabs } from "../components/frostedSplit/FrostedSplitTabs";
import type { SplitArchiveTab } from "../components/frostedSplit/splitArchiveTypes";
import { useFocusDoubleClickHandler } from "../exhibits/focusDoubleClick";
import { releaseSpacePointerLock } from "../space/requestSpacePointerLock";

function isOverlayContentClick(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return !!target.closest(
    [
      "button",
      "a",
      "input",
      "textarea",
      "select",
      "[role='button']",
      ".frosted-split",
    ].join(","),
  );
}

function getInitialSplitTab(tab: OverlayTab): SplitArchiveTab {
  return tab === "devStories" ? "devStories" : "lizzardkevin";
}

export function OverlayLayer({
  tab,
  closing,
  onRequestClose,
  onClosed,
}: {
  tab: OverlayTab;
  closing: boolean;
  onRequestClose: (opts?: { fromEscape?: boolean }) => void;
  onClosed: () => void;
}) {
  const handleBlankDoubleClick = useFocusDoubleClickHandler(onRequestClose);

  useEffect(() => {
    if (!tab || closing) return;
    releaseSpacePointerLock();
  }, [tab, closing]);

  useEffect(() => {
    if (!tab) return;
    if (!closing) return;
    const t = window.setTimeout(() => onClosed(), 320);
    return () => window.clearTimeout(t);
  }, [closing, onClosed, tab]);

  useEffect(() => {
    if (!tab) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRequestClose({ fromEscape: true });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tab, onRequestClose]);

  if (!tab) return null;

  const easing = "cubic-bezier(0.16, 1, 0.3, 1)";
  const anim = closing
    ? `overlayCondenseOut 320ms ${easing} forwards`
    : `overlayCondenseIn 520ms ${easing} both`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-describedby="overlay-exit-hint"
      className="overlay-layer"
      onClick={handleBlankDoubleClick}
    >
      <button
        type="button"
        className="overlay-close-button"
        aria-label="关闭 Overlay"
        onClick={(e) => {
          e.stopPropagation();
          onRequestClose();
        }}
      >
        <span aria-hidden>×</span>
      </button>

      <div
        className="overlay-layer__panel"
        style={{ animation: anim }}
        onClick={(e) => {
          if (isOverlayContentClick(e.target)) {
            e.stopPropagation();
            return;
          }
          handleBlankDoubleClick();
        }}
      >
        <FrostedSplitTabs
          key={tab}
          initialTab={getInitialSplitTab(tab)}
          onSelectTab={() => undefined}
        />
      </div>

      <p id="overlay-exit-hint" className="overlay-exit-hint">
        双击空白退出
      </p>

      <style>{`
        @keyframes overlayCondenseIn {
          from { transform: scale(1.018); opacity: 0; filter: blur(18px) brightness(1.16); }
          to { transform: scale(1); opacity: 1; filter: blur(0) brightness(1); }
        }
        @keyframes overlayCondenseOut {
          from { transform: scale(1); opacity: 1; filter: blur(0) brightness(1); }
          to { transform: scale(1.01); opacity: 0; filter: blur(14px) brightness(1.12); }
        }
      `}</style>
    </div>
  );
}
