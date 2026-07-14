import { DesktopOverlayLayer, type DesktopOverlayLayerProps } from "./DesktopOverlayLayer";

export default function DevStoriesOverlayRoute(props: Omit<DesktopOverlayLayerProps, "tab">) {
  return <DesktopOverlayLayer {...props} tab="devStories" />;
}
