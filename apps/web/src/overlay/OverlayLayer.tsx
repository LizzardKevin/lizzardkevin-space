import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { OverlayTab } from "./OverlayState";
import { FrostedSplitTabs } from "../components/frostedSplit/FrostedSplitTabs";
import type { SplitArchiveTab } from "../components/frostedSplit/splitArchiveTypes";
import { releaseSpacePointerLock } from "../space/requestSpacePointerLock";

type SpaceWordRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

function getInitialSplitTab(tab: OverlayTab): SplitArchiveTab {
  return tab === "devStories" ? "devStories" : "lizzardkevin";
}

export function OverlayLayer({
  tab,
  closing,
  spaceWordSourceRect,
  onRequestClose,
  onClosed,
}: {
  tab: OverlayTab;
  closing: boolean;
  spaceWordSourceRect?: SpaceWordRect | null;
  onRequestClose: (opts?: { fromEscape?: boolean }) => void;
  onClosed: () => void;
}) {
  const spaceWordRef = useRef<HTMLSpanElement>(null);
  const requestedSplitTab = getInitialSplitTab(tab);
  const [splitSelection, setSplitSelection] = useState<{
    active: SplitArchiveTab;
    source: OverlayTab;
  } | null>(null);
  const [returnMorphPhase, setReturnMorphPhase] = useState<"from-source" | "settled">("from-source");
  const [returnMorphStyle, setReturnMorphStyle] = useState<CSSProperties | undefined>(undefined);
  const activeSplitTab = splitSelection?.source === tab ? splitSelection.active : requestedSplitTab;

  useEffect(() => {
    if (!tab || closing) return;
    releaseSpacePointerLock();
  }, [tab, closing]);

  useEffect(() => {
    if (!tab) return;
    if (!closing) return;
    const t = window.setTimeout(() => onClosed(), 620);
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

  useLayoutEffect(() => {
    if (!tab || closing) return;
    const target = spaceWordRef.current;
    if (!target || !spaceWordSourceRect) {
      setReturnMorphPhase("settled");
      setReturnMorphStyle(undefined);
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const sourceCenterX = spaceWordSourceRect.x + spaceWordSourceRect.width / 2;
    const sourceCenterY = spaceWordSourceRect.y + spaceWordSourceRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const scale = targetRect.width > 0 ? spaceWordSourceRect.width / targetRect.width : 1;

    setReturnMorphStyle({
      "--overlay-space-source-x": `${sourceCenterX - targetCenterX}px`,
      "--overlay-space-source-y": `${sourceCenterY - targetCenterY}px`,
      "--overlay-space-source-scale": `${Math.max(0.72, Math.min(1.28, scale))}`,
    } as CSSProperties);
    setReturnMorphPhase("from-source");

    const frame = window.requestAnimationFrame(() => {
      setReturnMorphPhase("settled");
    });
    return () => window.cancelAnimationFrame(frame);
  }, [closing, spaceWordSourceRect, tab]);

  if (!tab) return null;

  const easing = "cubic-bezier(0.16, 1, 0.3, 1)";
  const anim = closing
    ? `overlayCondenseOut 620ms ${easing} forwards`
    : `overlayCondenseIn 520ms ${easing} both`;
  const returnMorphClass = closing
    ? "overlay-return-button--closing"
    : returnMorphPhase === "from-source"
      ? "overlay-return-button--from-source"
      : "overlay-return-button--settled";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="overlay-layer"
    >
      <button
        type="button"
        aria-label="回到space"
        className={`overlay-return-button overlay-return-button--${activeSplitTab} ${returnMorphClass}`}
        data-cursor="interactive"
        data-cursor-tone={activeSplitTab === "lizzardkevin" ? "light" : "dark"}
        style={returnMorphStyle}
        onClick={() => onRequestClose()}
      >
        <span className="overlay-return-button__prefix">回到</span>
        <span ref={spaceWordRef} className="overlay-return-button__space">space</span>
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
