import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAudioDirector } from "../audio/useAudioDirector";
import { useTranslation } from "react-i18next";
import type { OverlayTab } from "../overlay/OverlayState";
import {
  SPACE_POINTER_LOCK_FAILED_EVENT,
  reserveSpacePointerLockRequestId,
  resumeSpaceFirstPersonAfterEscape,
  resumeSpaceFirstPersonWithCursorReturn,
  type SpacePointerLockFailureDetail,
} from "../space/requestSpacePointerLock";
import {
  shouldGuardSpacePointerLock,
  useSpacePointerLockGuard,
} from "../space/useSpacePointerLockGuard";
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
import { lightweightDesktopRoutePrefetch } from "../desktop/lightweightRoutePrefetch";
import {
  INITIAL_START_LOBBY_HANDOFF_STATE,
  reduceStartLobbyHandoff,
} from "../lobby/startLobbyHandoff";
import { SPACE_VISUAL_CSS_PROPERTIES } from "../space/spaceVisualTokens";
import { createSpaceReturnPointerLockAttemptCoordinator } from "../space/spaceReturnPointerLockAttempt";

const SpaceHost = lazy(() => import("../space/SpaceHost"));
const SpacePage = lazy(() => import("../pages/SpacePage"));
const DesktopTopBar = lazy(() =>
  import("../desktop/DesktopTopBar").then((module) => ({ default: module.DesktopTopBar })),
);
const ProfileOverlayRoute = lazy(() => import("../desktop/ProfileOverlayRoute"));
const DevStoriesOverlayRoute = lazy(() => import("../desktop/DevStoriesOverlayRoute"));

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

function DesktopRouteLoading() {
  const { t } = useTranslation();
  return (
    <div
      className="app-route-layer app-route-message desktop-route-loading"
      role="status"
      aria-live="polite"
    >
      <span className="desktop-route-loading__indicator" aria-hidden="true" />
      <p>{t("space.loading")}</p>
    </div>
  );
}

export default function DesktopApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const audio = useAudioDirector();
  const boot = useSpaceBootController();
  const [handoff, dispatchHandoff] = useReducer(
    reduceStartLobbyHandoff,
    INITIAL_START_LOBBY_HANDOFF_STATE,
  );
  const [spaceStarted, setSpaceStarted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [returningToSpace, setReturningToSpace] = useState(false);
  const returnAttemptRef = useRef(createSpaceReturnPointerLockAttemptCoordinator());
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

  useEffect(() => {
    lightweightDesktopRoutePrefetch.update({
      attemptId: boot.state.attemptId,
      phase: boot.state.phase,
    });
    return () => lightweightDesktopRoutePrefetch.cancel();
  }, [boot.state.attemptId, boot.state.phase]);

  const entered = handoff.phase === "entered";

  if (route.kind === "space" && returningToSpace) {
    setReturningToSpace(false);
  }

  useSpacePointerLockGuard(
    shouldGuardSpacePointerLock(entered, routeBlocked, returningToSpace),
  );

  useEffect(() => {
    const onPointerLockFailed = (event: Event) => {
      const detail = (event as CustomEvent<SpacePointerLockFailureDetail>).detail;
      if (!detail || !returnAttemptRef.current.fail(detail.requestId)) return;
      setReturningToSpace(false);
    };
    window.addEventListener(SPACE_POINTER_LOCK_FAILED_EVENT, onPointerLockFailed);
    return () => window.removeEventListener(SPACE_POINTER_LOCK_FAILED_EVENT, onPointerLockFailed);
  }, []);

  useLayoutEffect(() => {
    if (route.kind === "space") {
      returnAttemptRef.current.complete();
    }
  }, [route.kind]);

  useEffect(() => {
    if (!spaceStarted) return;
    if (boot.state.phase === "running") {
      dispatchHandoff({ type: "boot-running" });
    } else if (boot.state.phase === "failed") {
      dispatchHandoff({ type: "boot-failed" });
    }
  }, [boot.state.phase, spaceStarted]);

  useEffect(() => {
    if (handoff.phase !== "revealing") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dispatchHandoff({ type: "reveal-finished" });
    }
  }, [handoff.phase]);

  const onTrustedEnter = useCallback(() => {
    if (spaceStarted || route.kind !== "space" || handoff.phase !== "lobby") return;
    audio.unlock();
    dispatchHandoff({ type: "trusted-enter" });
  }, [audio, handoff.phase, route.kind, spaceStarted]);

  const onLobbyDisposed = useCallback(() => {
    if (spaceStarted || handoff.phase !== "disposing") return;
    boot.start();
    setSpaceStarted(true);
    dispatchHandoff({ type: "lobby-disposed" });
    void audio.setZone("architecture");
  }, [audio, boot, handoff.phase, spaceStarted]);

  const retryBoot = useCallback(() => {
    if (handoff.phase !== "failed") return;
    boot.retry();
    dispatchHandoff({ type: "retry" });
  }, [boot, handoff.phase]);

  const navigateToSpace = useCallback(
    (options?: { fromEscape?: boolean }) => {
      const returnAttempt = returnAttemptRef.current.begin(reserveSpacePointerLockRequestId);
      if (!returnAttempt.started) return;
      const pointerLockRequestId = returnAttempt.requestId;
      flushSync(() => setReturningToSpace(true));
      if (options?.fromEscape) {
        resumeSpaceFirstPersonAfterEscape(
          { entered, overlayOpen: false },
          pointerLockRequestId,
        );
      } else if (entered) {
        resumeSpaceFirstPersonWithCursorReturn(pointerLockRequestId);
      }
      navigate(APP_ROUTE_PATHS.space);
      if (route.kind === "space") returnAttemptRef.current.complete();
    },
    [entered, navigate, route.kind],
  );

  const beginOverlayClose = useCallback(
    (options?: { fromEscape?: boolean }) => {
      const returnAttempt = returnAttemptRef.current.begin(reserveSpacePointerLockRequestId);
      if (!returnAttempt.started) return;
      const pointerLockRequestId = returnAttempt.requestId;
      flushSync(() => {
        setClosing(true);
        setReturningToSpace(true);
      });
      if (options?.fromEscape) {
        resumeSpaceFirstPersonAfterEscape(
          { entered, overlayOpen: false },
          pointerLockRequestId,
        );
      } else if (entered) {
        resumeSpaceFirstPersonWithCursorReturn(pointerLockRequestId);
      }
    },
    [entered],
  );

  return (
    <div
      className="desktop-app"
      style={{
        ...SPACE_VISUAL_CSS_PROPERTIES,
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
      }}
    >
      {spaceStarted && entered && route.kind === "space" ? (
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
              entered={entered}
              focusedExhibitId={focusedExhibitId}
              onNavigateToSpace={navigateToSpace}
              onNavigateToWork={(exhibitId) => navigate(workRoute(exhibitId))}
              pauseMainAudio={routePolicy.pauseMainAudio}
              routeBlocked={routeBlocked}
            />
          ) : null
        }
      />

      {route.kind === "space" &&
      (handoff.phase === "lobby" || handoff.phase === "disposing") ? (
        <Suspense fallback={<div className="start-lobby" role="status" aria-live="polite" />}>
          <SpacePage
            disposing={handoff.phase === "disposing"}
            onTrustedEnter={onTrustedEnter}
            onDisposed={onLobbyDisposed}
          />
        </Suspense>
      ) : null}

      {handoff.phase === "disposing" ||
      handoff.phase === "booting" ||
      handoff.phase === "failed" ||
      handoff.phase === "revealing" ? (
        <div
          className={`start-lobby-handoff__cover${handoff.phase === "revealing" ? " start-lobby-handoff__cover--revealing" : ""}`}
          role={handoff.phase === "failed" ? "alert" : "status"}
          aria-live="polite"
          data-handoff-phase={handoff.phase}
          onTransitionEnd={(event) => {
            if (
              event.target === event.currentTarget &&
              event.propertyName === "opacity" &&
              handoff.phase === "revealing"
            ) {
              dispatchHandoff({ type: "reveal-finished" });
            }
          }}
        >
          {handoff.phase === "failed" && boot.state.phase === "failed" ? (
            <div className="start-lobby-handoff__failure">
              <p>{boot.state.error ?? "SPACE could not start."}</p>
              <button type="button" onClick={retryBoot}>Retry</button>
            </div>
          ) : handoff.phase === "booting" ? (
            <div className="start-lobby-handoff__status">
              <span>Loading SPACE</span>
              {boot.state.items.total > 0 ? (
                <span>
                  {boot.state.items.loaded + boot.state.items.failed + boot.state.items.deferred}/
                  {boot.state.items.total}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {overlayTab !== null ? (
        <Suspense fallback={<DesktopRouteLoading />}>
          {overlayTab === "lizzardkevin" ? (
            <ProfileOverlayRoute
              closing={closing}
              spaceWordSourceRect={routeNavigationState?.spaceWordSourceRect ?? null}
              onRequestClose={beginOverlayClose}
              onClosed={() => {
                setClosing(false);
                navigate(APP_ROUTE_PATHS.space);
              }}
            />
          ) : (
            <DevStoriesOverlayRoute
              closing={closing}
              spaceWordSourceRect={routeNavigationState?.spaceWordSourceRect ?? null}
              onRequestClose={beginOverlayClose}
              onClosed={() => {
                setClosing(false);
                navigate(APP_ROUTE_PATHS.space);
              }}
            />
          )}
        </Suspense>
      ) : null}
    </div>
  );
}
