import { TopBar } from "../components/TopBar";
import { OverlayLayer } from "../overlay/OverlayLayer";
import type { OverlayTab } from "../overlay/OverlayState";

type SpaceWordRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export function DesktopTopBar({
  onOpenTab,
  onCloseTab,
}: {
  onOpenTab: (tab: Exclude<OverlayTab, null>) => void;
  onCloseTab: () => void;
}) {
  return <TopBar onOpenTab={onOpenTab} onCloseTab={onCloseTab} />;
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
