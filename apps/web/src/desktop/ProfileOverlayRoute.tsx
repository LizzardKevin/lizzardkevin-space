import { DesktopOverlayLayer, type DesktopOverlayLayerProps } from "./DesktopOverlayLayer";

export default function ProfileOverlayRoute(props: Omit<DesktopOverlayLayerProps, "tab">) {
  return <DesktopOverlayLayer {...props} tab="lizzardkevin" />;
}
