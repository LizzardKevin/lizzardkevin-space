import { SpacePage } from "./pages/SpacePage";
import {
  releaseSpacePointerLock,
  resumeSpaceFirstPersonAfterEscape,
  resumeSpaceFirstPersonWithCursorReturn,
} from "./space/requestSpacePointerLock";
import { useSpacePointerLockGuard } from "./space/useSpacePointerLockGuard";
import type { OverlayTab } from "./overlay/OverlayState";
import { useClientPlatform } from "./platform/useClientPlatform";
import { Suspense, lazy, useMemo, useState } from "react";
import { flushSync } from "react-dom";

const DesktopTopBar = lazy(() =>
  import("./desktop/DesktopChrome").then((module) => ({
    default: module.DesktopTopBar,
  })),
);

const DesktopOverlayLayer = lazy(() =>
  import("./desktop/DesktopChrome").then((module) => ({
    default: module.DesktopOverlayLayer,
  })),
);

type SpaceWordRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

function captureSpaceWordSourceRect(): SpaceWordRect | null {
  const el = document.querySelector<HTMLElement>("[data-space-word-origin='true']");
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    height: rect.height,
    width: rect.width,
    x: rect.left,
    y: rect.top,
  };
}

export default function App() {
  const platform = useClientPlatform();
  const isDesktop = platform === "desktop";
  const [tab, setTab] = useState<OverlayTab>(null);
  const [closing, setClosing] = useState(false);
  const [spaceWordSourceRect, setSpaceWordSourceRect] = useState<SpaceWordRect | null>(null);

  /** 关闭动效期间不再阻挡 SPACE 控制，以便同步恢复 pointer lock。 */
  const spaceOverlayBlocking = tab !== null && !closing;
  const appOverlayContext = useMemo(
    () => ({ isOverlayOpen: spaceOverlayBlocking }),
    [spaceOverlayBlocking],
  );

  useSpacePointerLockGuard(isDesktop && spaceOverlayBlocking);

  const openOverlayTab = (next: Exclude<OverlayTab, null>) => {
    const sourceRect = captureSpaceWordSourceRect();
    releaseSpacePointerLock();
    flushSync(() => {
      setSpaceWordSourceRect(sourceRect);
      setClosing(false);
      setTab(next);
    });
  };

  const closeOverlayToSpace = (opts?: { fromEscape?: boolean }) => {
    flushSync(() => setClosing(true));
    if (opts?.fromEscape) {
      resumeSpaceFirstPersonAfterEscape({ entered: true, overlayOpen: false });
      return;
    }
    resumeSpaceFirstPersonWithCursorReturn();
  };

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      {isDesktop && tab === null && (
        <Suspense fallback={null}>
          <DesktopTopBar
            onOpenTab={openOverlayTab}
            onCloseTab={() => resumeSpaceFirstPersonWithCursorReturn()}
          />
        </Suspense>
      )}
      <SpacePage overlay={appOverlayContext} />
      {isDesktop && tab !== null && (
        <Suspense fallback={null}>
          <DesktopOverlayLayer
            tab={tab}
            closing={closing}
            spaceWordSourceRect={spaceWordSourceRect}
            onRequestClose={closeOverlayToSpace}
            onClosed={() => {
              setClosing(false);
              setTab(null);
              setSpaceWordSourceRect(null);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
