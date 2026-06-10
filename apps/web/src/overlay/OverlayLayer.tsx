import { useEffect, useMemo } from "react";
import type { OverlayTab } from "./OverlayState";
import { LizzardKevinPage } from "../pages/LizzardKevinPage";
import { DevStoriesPage } from "../pages/DevStoriesPage";
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
      ".profile-page__header",
      ".profile-page__links",
      ".profile-page__rail",
      ".profile-section",
      ".dev-stories__header",
      ".dev-stories__rail",
      ".dev-story",
    ].join(","),
  );
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
    const t = window.setTimeout(() => onClosed(), 260);
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
        {content}
      </div>

      <p id="overlay-exit-hint" className="overlay-exit-hint">
        双击空白退出
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
