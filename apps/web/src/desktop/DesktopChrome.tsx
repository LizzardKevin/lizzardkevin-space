import { TopBar } from "../components/TopBar";
import { OverlayLayer } from "../overlay/OverlayLayer";
import type { OverlayTab } from "../overlay/OverlayState";
import { useNavigate } from "react-router-dom";

function captureSpaceWordSourceRect() {
  const element = document.querySelector<HTMLElement>("[data-space-word-origin='true']");
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { height: rect.height, width: rect.width, x: rect.left, y: rect.top };
}

type SpaceWordRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export function DesktopTopBar({
  onNavigateToSpace,
}: {
  onNavigateToSpace: () => void;
}) {
  const navigate = useNavigate();
  const navigateToOverlay = (tab: Exclude<OverlayTab, null>) => {
    const spaceWordSourceRect = captureSpaceWordSourceRect();
    navigate(tab === "devStories" ? "/devstories" : "/profile", {
      state: { spaceWordSourceRect },
    });
  };
  return (
    <TopBar
      onOpenTab={navigateToOverlay}
      onCloseTab={onNavigateToSpace}
    />
  );
}

export function DesktopOverlayLayer({
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
  return (
    <OverlayLayer
      tab={tab}
      closing={closing}
      spaceWordSourceRect={spaceWordSourceRect}
      onRequestClose={onRequestClose}
      onClosed={onClosed}
    />
  );
}
