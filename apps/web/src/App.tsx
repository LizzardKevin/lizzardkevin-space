import { SpacePage } from "./pages/SpacePage";
import {
  releaseSpacePointerLock,
  resumeSpaceFirstPersonAfterEscape,
  resumeSpaceFirstPersonWithCursorReturn,
} from "./space/requestSpacePointerLock";
import { useSpacePointerLockGuard } from "./space/useSpacePointerLockGuard";
import { TopBar } from "./components/TopBar";
import { OverlayLayer } from "./overlay/OverlayLayer";
import type { OverlayTab } from "./overlay/OverlayState";
import { useClientPlatform } from "./platform/useClientPlatform";
import { useMemo, useState } from "react";
import { flushSync } from "react-dom";

export default function App() {
  const platform = useClientPlatform();
  const isDesktop = platform === "desktop";
  const [tab, setTab] = useState<OverlayTab>(null);
  const [closing, setClosing] = useState(false);

  /** 关闭动效期间不再阻挡 SPACE 控制，以便同步恢复 pointer lock。 */
  const spaceOverlayBlocking = tab !== null && !closing;
  const appOverlayContext = useMemo(
    () => ({ isOverlayOpen: spaceOverlayBlocking }),
    [spaceOverlayBlocking],
  );

  useSpacePointerLockGuard(isDesktop && spaceOverlayBlocking);

  const openOverlayTab = (next: Exclude<OverlayTab, null>) => {
    releaseSpacePointerLock();
    flushSync(() => {
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
        <TopBar
          onOpenTab={openOverlayTab}
          onCloseTab={() => resumeSpaceFirstPersonWithCursorReturn()}
        />
      )}
      <SpacePage overlay={appOverlayContext} />
      {isDesktop && (
        <OverlayLayer
          tab={tab}
          closing={closing}
          onRequestClose={closeOverlayToSpace}
          onClosed={() => {
            setClosing(false);
            setTab(null);
          }}
        />
      )}
    </div>
  );
}
