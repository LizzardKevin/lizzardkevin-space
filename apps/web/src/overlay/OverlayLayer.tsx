import { useEffect, useState } from "react";
import type { OverlayTab } from "./OverlayState";
import { FrostedSplitTabs } from "../components/frostedSplit/FrostedSplitTabs";
import type { SplitArchiveTab } from "../components/frostedSplit/splitArchiveTypes";
import { releaseSpacePointerLock } from "../space/requestSpacePointerLock";

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
  const requestedSplitTab = getInitialSplitTab(tab);
  const [splitSelection, setSplitSelection] = useState<{
    active: SplitArchiveTab;
    source: OverlayTab;
  } | null>(null);
  const activeSplitTab = splitSelection?.source === tab ? splitSelection.active : requestedSplitTab;

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
      className="overlay-layer"
    >
      <button
        type="button"
        className={`overlay-return-button overlay-return-button--${activeSplitTab}`}
        data-cursor="interactive"
        data-cursor-tone={activeSplitTab === "lizzardkevin" ? "light" : "dark"}
        onClick={() => onRequestClose()}
      >
        回到space
      </button>

      <div
        className="overlay-layer__panel"
        style={{ animation: anim }}
      >
        <FrostedSplitTabs
          key={tab}
          initialTab={requestedSplitTab}
          onSelectTab={(active) => setSplitSelection({ active, source: tab })}
        />
      </div>

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
