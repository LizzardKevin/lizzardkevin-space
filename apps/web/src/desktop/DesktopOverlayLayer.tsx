import { OverlayLayer } from "../overlay/OverlayLayer";
import type { OverlayTab } from "../overlay/OverlayState";

export type SpaceWordRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

export type DesktopOverlayLayerProps = {
  tab: OverlayTab;
  closing: boolean;
  spaceWordSourceRect?: SpaceWordRect | null;
  onRequestClose: (opts?: { fromEscape?: boolean }) => void;
  onClosed: () => void;
};

export function DesktopOverlayLayer(props: DesktopOverlayLayerProps) {
  return <OverlayLayer {...props} />;
}
