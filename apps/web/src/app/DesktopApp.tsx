import { Suspense, lazy, useCallback, useState } from "react";
import { flushSync } from "react-dom";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAudioDirector } from "../audio/useAudioDirector";
import type { OverlayTab } from "../overlay/OverlayState";
import { SpacePage } from "../pages/SpacePage";
import { useEntryTransition } from "../hooks/useEntryTransition";
import {
  resumeSpaceFirstPerson,
  resumeSpaceFirstPersonAfterEscape,
  resumeSpaceFirstPersonWithCursorReturn,
} from "../space/requestSpacePointerLock";
import { useSpacePointerLockGuard } from "../space/useSpacePointerLockGuard";
import { NotFound, ProfileAliasRoute, SpaceAliasRoute } from "./appRoutes";
import { APP_ROUTE_PATHS, resolveAppRoute, workRoute } from "./routeConfig";

const SpaceHost = lazy(() => import("../space/SpaceHost"));
const DesktopTopBar = lazy(() =>
  import("../desktop/DesktopChrome").then((module) => ({ default: module.DesktopTopBar })),
);
const DesktopOverlayLayer = lazy(() =>
  import("../desktop/DesktopChrome").then((module) => ({ default: module.DesktopOverlayLayer })),
);

type SpaceWordRect = { height: number; width: number; x: number; y: number };

function ColdWorkRoute({ exhibitId }: { exhibitId: string }) {
  return (
    <main role="main" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <p>Work {exhibitId} is available after entering SPACE.</p>
    </main>
  );
}

export default function DesktopApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const audio = useAudioDirector();
  const entry = useEntryTransition();
  const [spaceStarted, setSpaceStarted] = useState(false);
  const [closing, setClosing] = useState(false);
  const route = resolveAppRoute(location.pathname);
  const routeBlocked = route.kind !== "space";
  const overlayTab: OverlayTab =
    route.kind === "profile" ? "lizzardkevin" : route.kind === "devstories" ? "devStories" : null;
  const focusedExhibitId = route.kind === "work" ? route.exhibitId : null;
  const routeNavigationState = location.state as { spaceWordSourceRect?: SpaceWordRect | null } | null;

  useSpacePointerLockGuard(routeBlocked);

  const onTrustedEnter = useCallback(() => {
    if (spaceStarted || route.kind !== "space") return;
    entry.freezeButtonFloat();
    entry.beginLoading();
    audio.unlock();
    setSpaceStarted(true);
    resumeSpaceFirstPerson();
    void audio.setZone("architecture");
  }, [audio, entry, route.kind, spaceStarted]);

  const navigateToSpace = useCallback(
    (options?: { fromEscape?: boolean }) => {
      navigate(APP_ROUTE_PATHS.space);
      if (options?.fromEscape) {
        resumeSpaceFirstPersonAfterEscape({ entered: entry.entered, overlayOpen: false });
      } else if (entry.entered) {
        resumeSpaceFirstPersonWithCursorReturn();
      }
    },
    [entry.entered, navigate],
  );

  const beginOverlayClose = useCallback(
    (options?: { fromEscape?: boolean }) => {
      flushSync(() => setClosing(true));
      if (options?.fromEscape) {
        resumeSpaceFirstPersonAfterEscape({ entered: entry.entered, overlayOpen: false });
      }
    },
    [entry.entered],
  );

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      {spaceStarted && route.kind === "space" ? (
        <Suspense fallback={null}>
          <DesktopTopBar onNavigateToSpace={() => navigateToSpace()} />
        </Suspense>
      ) : null}

      <Routes>
        <Route
          path="/"
          element={
            spaceStarted ? null : <SpacePage entry={entry} onTrustedEnter={onTrustedEnter} />
          }
        />
        <Route
          path="/works/:exhibitId"
          element={spaceStarted || route.kind !== "work" ? null : <ColdWorkRoute exhibitId={route.exhibitId} />}
        />
        <Route path="/profile" element={null} />
        <Route path="/devstories" element={null} />
        <Route path="/space" element={<SpaceAliasRoute />} />
        <Route path="/lizzardkevin" element={<ProfileAliasRoute />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {spaceStarted ? <SpaceHost
        entry={entry}
        focusedExhibitId={focusedExhibitId}
        onNavigateToSpace={navigateToSpace}
        onNavigateToWork={(exhibitId) => navigate(workRoute(exhibitId))}
        routeBlocked={routeBlocked}
      /> : null}

      {overlayTab !== null ? (
        <Suspense fallback={null}>
          <DesktopOverlayLayer
            tab={overlayTab}
            closing={closing}
            spaceWordSourceRect={routeNavigationState?.spaceWordSourceRect ?? null}
            onRequestClose={beginOverlayClose}
            onClosed={() => {
              setClosing(false);
              navigateToSpace();
            }}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
