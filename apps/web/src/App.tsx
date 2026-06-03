import { SpacePage } from "./pages/SpacePage";
import { TopBar } from "./components/TopBar";
import { OverlayLayer } from "./overlay/OverlayLayer";
import type { OverlayTab } from "./overlay/OverlayState";
import { useEffect, useMemo, useState } from "react";

export default function App() {
  const [tab, setTab] = useState<OverlayTab>(null);
  const [closing, setClosing] = useState(false);

  const isOverlayOpen = tab !== null;
  const appOverlayContext = useMemo(() => ({ isOverlayOpen }), [isOverlayOpen]);

  useEffect(() => {
    if (!isOverlayOpen) return;
    // 打开 overlay 时释放 pointer lock，唤出鼠标
    if (document.pointerLockElement) document.exitPointerLock();
  }, [isOverlayOpen]);

  const enterSpaceFps = () => {
    const canvas = document.getElementById("space-canvas") as HTMLCanvasElement | null;
    canvas?.requestPointerLock?.();
  };

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
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
      <SpacePage overlay={appOverlayContext} />
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
    </div>
  );
}
