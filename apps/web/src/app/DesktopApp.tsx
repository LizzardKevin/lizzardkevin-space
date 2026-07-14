import { Suspense, lazy, useCallback, useState } from "react";
import { flushSync } from "react-dom";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAudioDirector } from "../audio/useAudioDirector";
import { useTranslation } from "react-i18next";
import type { OverlayTab } from "../overlay/OverlayState";
import { SpacePage } from "../pages/SpacePage";
import { useEntryTransition } from "../hooks/useEntryTransition";
import {
  resumeSpaceFirstPersonAfterEscape,
  resumeSpaceFirstPersonWithCursorReturn,
} from "../space/requestSpacePointerLock";
import { useSpacePointerLockGuard } from "../space/useSpacePointerLockGuard";
import { PersistentSpaceHostBoundary } from "../space/PersistentSpaceHostBoundary";
import { resolveSpaceRouteRuntimePolicy, type SpaceRouteKind } from "../space/routeRuntimePolicy";
import { NotFound, ProfileAliasRoute, SpaceAliasRoute } from "./appRoutes";
import {
  APP_ROUTE_PATHS,
  resolveAppRoute,
  resolveDesktopWorkRouteSurface,
  workRoute,
} from "./routeConfig";
import { isKnownExhibitId } from "../content/lightweightExhibitIndex";
import { useSpaceBootController } from "../boot/useSpaceBootController";

const SpaceHost = lazy(() => import("../space/SpaceHost"));
const DesktopTopBar = lazy(() =>
  import("../desktop/DesktopChrome").then((module) => ({ default: module.DesktopTopBar })),
);
const DesktopOverlayLayer = lazy(() =>
  import("../desktop/DesktopChrome").then((module) => ({ default: module.DesktopOverlayLayer })),
);

type SpaceWordRect = { height: number; width: number; x: number; y: number };

function ColdWorkRoute({ exhibitId }: { exhibitId: string }) {
  const { t } = useTranslation();
  const known = isKnownExhibitId(exhibitId);
  return (
    <main role="main" className="app-route-layer app-route-message">
      <p>{known ? t("route.workRequiresSpace", { id: exhibitId }) : t("route.notFound")}</p>
      <Link to="/">{t(known ? "route.enterSpace" : "route.invalidWorkReturn")}</Link>
    </main>
  );
}

export default function DesktopApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const audio = useAudioDirector();
  const entry = useEntryTransition();
  const boot = useSpaceBootController();
  const [spaceStarted, setSpaceStarted] = useState(false);
  const [closing, setClosing] = useState(false);
  const route = resolveAppRoute(location.pathname);
  const policyRoute: SpaceRouteKind =
    route.kind === "space-alias"
      ? "space"
      : route.kind === "profile-alias"
        ? "profile"
        : route.kind;
  const routePolicy = resolveSpaceRouteRuntimePolicy(policyRoute);
  const routeBlocked = routePolicy.routeBlocked;
  const overlayTab: OverlayTab =
    route.kind === "profile" ? "lizzardkevin" : route.kind === "devstories" ? "devStories" : null;
  const focusedExhibitId = route.kind === "work" ? route.exhibitId : null;
  const workRouteSurface = resolveDesktopWorkRouteSurface(route, spaceStarted);
  const routeNavigationState = location.state as { spaceWordSourceRect?: SpaceWordRect | null } | null;

  useSpacePointerLockGuard(routeBlocked);

  const onTrustedEnter = useCallback(() => {
    if (spaceStarted || route.kind !== "space") return;
    entry.freezeButtonFloat();
    entry.beginLoading();
    audio.unlock();
    boot.start();
    setSpaceStarted(true);
    void audio.setZone("architecture");
  }, [audio, boot, entry, route.kind, spaceStarted]);

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
      {spaceStarted && entry.entered && route.kind === "space" ? (
        <Suspense fallback={null}>
          <DesktopTopBar onNavigateToSpace={() => navigateToSpace()} />
        </Suspense>
      ) : null}

      <PersistentSpaceHostBoundary
        routeSurface={
          <Routes>
            <Route path="/" element={null} />
            <Route
              path="/works/:exhibitId"
              element={
                workRouteSurface === "not-found" ? <NotFound /> : workRouteSurface === "cold-work" && route.kind === "work" ? (
                  <ColdWorkRoute exhibitId={route.exhibitId} />
                ) : null
              }
            />
            <Route path="/profile" element={null} />
            <Route path="/devstories" element={null} />
            <Route path="/space" element={<SpaceAliasRoute />} />
            <Route path="/lizzardkevin" element={<ProfileAliasRoute />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        }
        startedHost={
          spaceStarted ? (
            <SpaceHost
              boot={boot}
              entry={entry}
              focusedExhibitId={focusedExhibitId}
              onNavigateToSpace={navigateToSpace}
              onNavigateToWork={(exhibitId) => navigate(workRoute(exhibitId))}
              pauseMainAudio={routePolicy.pauseMainAudio}
              routeBlocked={routeBlocked}
            />
          ) : null
        }
      />

      {route.kind === "space" && entry.showSplash ? (
        <SpacePage entry={entry} onTrustedEnter={onTrustedEnter} />
      ) : null}

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
