import { SpacePage } from "./pages/SpacePage";
import { requestSpacePointerLock } from "./space/requestSpacePointerLock";
import { TopBar } from "./components/TopBar";
import { OverlayLayer } from "./overlay/OverlayLayer";
import type { OverlayTab } from "./overlay/OverlayState";
import { useClientPlatform } from "./platform/useClientPlatform";
import { useEffect, useMemo, useState } from "react";

export default function App() {
  const platform = useClientPlatform();
  const isDesktop = platform === "desktop";
  const [tab, setTab] = useState<OverlayTab>(null);
  const [closing, setClosing] = useState(false);

  const isOverlayOpen = tab !== null;
  const appOverlayContext = useMemo(() => ({ isOverlayOpen }), [isOverlayOpen]);

  useEffect(() => {
    if (!isDesktop || !isOverlayOpen) return;
    if (document.pointerLockElement) document.exitPointerLock();
  }, [isDesktop, isOverlayOpen]);

  const enterSpaceFps = () => {
    requestSpacePointerLock();
  };

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      {isDesktop && (
        <TopBar
          onOpenTab={(t) => {
            setClosing(false);
            setTab(t);
          }}
          onCloseTab={() => {
            if (!tab) return;
            setClosing(true);
            enterSpaceFps();
          }}
        />
      )}
      <SpacePage overlay={appOverlayContext} />
      {isDesktop && (
        <OverlayLayer
          tab={tab}
          closing={closing}
          onRequestClose={() => {
            setClosing(true);
            enterSpaceFps();
          }}
          onClosed={() => {
            setClosing(false);
            setTab(null);
          }}
        />
      )}
    </div>
  );
}
