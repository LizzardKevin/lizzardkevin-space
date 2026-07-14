import "../runtime/suppressThirdPartyDeprecationWarnings";
import { Canvas } from "@react-three/fiber";
import { Physics, useRapier } from "@react-three/rapier";
import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Crosshair } from "../components/Crosshair";
import { SpaceCursorOverlay } from "../cursor/SpaceCursorOverlay";
import { Toast } from "../components/Toast";
import type { EntryTransition } from "../entry/entryTypes";
import type { ExhibitTarget } from "../exhibits/exhibitTarget";
import { loadManifest } from "../exhibits/manifest";
import type { ExhibitManifestItem } from "../exhibits/manifest";
import { PlaybackBar } from "../media/PlaybackBar";
import { createWebGPURenderer } from "../rendering/createWebGPURenderer";
import { GalleryRenderPipeline } from "../rendering/GalleryRenderPipeline";
import {
  RENDERER_PROFILES,
  resolveRendererDpr,
  switchRendererProfileState,
  type RendererProfile,
} from "../rendering/rendererProfile";
import {
  bridgeRendererInitialization,
  reportRendererInitializationErrorIfMounted,
} from "../rendering/rendererLifecycle";
import { WebGPUUnavailable } from "../rendering/WebGPUUnavailable";
import { SpaceMovementDebugOverlay } from "../scenes/debug/SpaceMovementDebugOverlay";
import { SpaceScene } from "../scenes/SpaceScene";
import type { SpaceJumpNoticeKey } from "../scenes/Player/PlayerController";
import type { ProjectorSlideCommand, ProjectorSlideDirection } from "../scenes/projector/projectorSlides";
import {
  ENABLE_GALLERY_GLB,
  ENABLE_GALLERY_RUNTIME_SHADOWS,
  ENABLE_GALLERY_TOON,
  GALLERY_SPAWN,
  GALLERY_TOON,
} from "../scenes/gallery/galleryConfig";
import { GalleryAtmosphere } from "../scenes/gallery/GalleryAtmosphere";
import { spawnToCameraPosition } from "../scenes/gallery/resolveGallerySpawn";
import { SPACE_ONBOARDING_DEMO_EXHIBIT_ID } from "../scenes/onboarding/spaceOnboardingConfig";
import { SpaceOnboardingFocusDemo } from "../scenes/onboarding/SpaceOnboardingFocusDemo";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useSpaceVisualSettings } from "../space/spaceVisualSettings";

import {
  SPACE_POINTER_LOCK_FAILED_EVENT,
  engageSpaceFirstPerson,
  resumeSpaceFirstPersonAfterEscape,
  resumeSpaceFirstPersonWithCursorReturn,
} from "../space/requestSpacePointerLock";
import { isPermanentPointerLockFailure } from "../space/pointerLockFailure";
import {
  clearSpaceDailyResume,
  readSpaceDailyResume,
  shouldSaveSpaceDailyResume,
  writeSpaceDailyResume,
  type SpacePlayerPose,
} from "../space/spaceDailyResume";
import { readSpaceSessionPose, writeSpaceSessionPose } from "../space/spaceSessionPose";
import { flushSpacePoseOnPageHide } from "../space/spacePosePageHide";
import type { SpaceBootController } from "../boot/useSpaceBootController";
import { watchRendererDeviceLoss } from "../boot/rendererDeviceLoss";
import {
  disposeOwnedBootRenderer,
  replaceWatchedBootRenderer,
  type DisposableBootRenderer,
} from "../boot/ownedBootRenderer";
import {
  createRendererGeneration,
  resolveRendererGeneration,
  runForActiveRendererGeneration,
} from "../boot/rendererGeneration";
import { BootAttemptErrorBoundary } from "../boot/BootAttemptErrorBoundary.ts";
import { isBootReportingEnabled } from "../boot/bootReportingGate";

const FocusOverlay = lazy(() =>
  import("../exhibits/FocusOverlay").then((module) => ({
    default: module.FocusOverlay,
  })),
);

const JUMP_HINT_VISIBLE_MS = 5000;
const SPACE_PHYSICS_TIME_STEP = 1 / 60;
const SPACE_DAILY_RESUME_SAVE_INTERVAL_MS = 1000;
const SPACE_DAILY_RESUME_RESET_PARAM = "resetSpaceOnboarding";
const SPACE_DEBUG_FOCUS_PARAM = "debugFocus";

type SpacePointerLockFailedEvent = CustomEvent<{
  message: string;
  permanent?: boolean;
}>;

type SpaceToastKey = "space.pointerLockFailed" | "space.exhibitLoading" | "space.manifestMissing";
type SpaceToastState = {
  key: SpaceToastKey;
  values?: Record<string, string>;
};

function JumpHint({ message, visible }: { message: string; visible: boolean }) {
  if (!visible || !message) return null;
  return <div className="jump-hint">{message}</div>;
}

function ProjectorControlsHint({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <div className="projector-controls-hint" aria-hidden>
      <span>{t("space.projector.previous")}</span>
      <span>{t("space.projector.next")}</span>
    </div>
  );
}

function readInitialDailyResumePose(params: URLSearchParams) {
  if (params.get(SPACE_DAILY_RESUME_RESET_PARAM) === "1") {
    clearSpaceDailyResume();
    return null;
  }
  return readSpaceDailyResume();
}

function readDevFocusExhibitId(params: URLSearchParams) {
  if (!import.meta.env.DEV) return null;
  return params.get(SPACE_DEBUG_FOCUS_PARAM);
}

function PhysicsBootBoundary({ onReady }: { onReady: () => void }) {
  useRapier();
  useEffect(() => onReady(), [onReady]);
  return null;
}

function SpaceBootFailure({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#050505",
        color: "rgba(255,255,255,0.92)",
        fontFamily: "system-ui",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <p>{error ?? t("space.rendererUnavailableBody")}</p>
        <button type="button" onClick={onRetry}>{t("space.retry")}</button>
      </div>
    </div>
  );
}

export function SpaceDesktopExperience({
  boot,
  entry,
  focusedExhibitId,
  overlay,
  loadExhibits,
  onNavigateToSpace,
  onNavigateToWork,
  onCanvasReady,
  routeBlocked,
}: {
  boot: SpaceBootController;
  entry: EntryTransition;
  focusedExhibitId: string | null;
  overlay: { isOverlayOpen: boolean };
  loadExhibits: boolean;
  onNavigateToSpace: (options?: { fromEscape?: boolean }) => void;
  onNavigateToWork: (exhibitId: string) => void;
  onCanvasReady?: () => void;
  routeBlocked: boolean;
}) {
  const {
    state: bootState,
    retry: retryBoot,
    milestoneReady,
    manifestResolved,
    exhibitReady,
    exhibitFailed,
    exhibitDeferred,
    fail: failBoot,
    deviceLost,
  } = boot;
  const attemptId = bootState.attemptId;
  const [exhibitTarget, setExhibitTarget] = useState<ExhibitTarget | null>(null);
  const { t } = useTranslation();
  const [manifestResult, setManifestResult] = useState<{
    attemptId: number;
    exhibits: ExhibitManifestItem[];
  } | null>(null);
  const manifest = manifestResult?.attemptId === attemptId ? manifestResult.exhibits : null;
  /** 退出动效期间仍挂载 Focus，但已恢复 SPACE 第一人称控制 */
  const [focusClosing, setFocusClosing] = useState<ExhibitManifestItem | null>(null);
  const [toast, setToast] = useState<SpaceToastState | null>(null);
  const [crosshairPulseNonce, setCrosshairPulseNonce] = useState(0);
  const [suppressNextExhibitClick, setSuppressNextExhibitClick] = useState(false);
  const [jumpHintKey, setJumpHintKey] = useState<SpaceJumpNoticeKey | null>(null);
  const [jumpHintVisible, setJumpHintVisible] = useState(false);
  const [projectorSlideCommand, setProjectorSlideCommand] =
    useState<ProjectorSlideCommand | null>(null);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [pointerLockUnavailable, setPointerLockUnavailable] = useState(false);
  const [onboardingFocusOpen, setOnboardingFocusOpen] = useState(false);
  const [onboardingFocusClosing, setOnboardingFocusClosing] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [dailyResumePose] = useState<SpacePlayerPose | null>(() =>
    readInitialDailyResumePose(searchParams),
  );
  const [sessionResumePose] = useState<SpacePlayerPose | null>(() => readSpaceSessionPose());
  const initialResumePose = sessionResumePose ?? dailyResumePose;
  const [devFocusExhibitId] = useState<string | null>(() => readDevFocusExhibitId(searchParams));
  const [onboardingCompleted, setOnboardingCompleted] = useState(initialResumePose !== null);
  const latestSpacePoseRef = useRef<SpacePlayerPose | null>(initialResumePose);
  const lastDailyResumeSaveAtRef = useRef(0);
  const lastSessionPoseSaveAtRef = useRef(0);
  const projectorSlideCommandNonceRef = useRef(0);
  const devFocusOpenedRef = useRef(false);
  const rendererOwnerMountedRef = useRef(true);
  const rendererLossCleanupRef = useRef<(() => void) | null>(null);
  const ownedRendererRef = useRef<DisposableBootRenderer | null>(null);
  const bootReportingScopeRef = useRef({ attemptId, phase: bootState.phase });
  useLayoutEffect(() => {
    bootReportingScopeRef.current = { attemptId, phase: bootState.phase };
  }, [attemptId, bootState.phase]);
  const canReportBootProgress = useCallback(
    (reportedAttemptId: number) =>
      isBootReportingEnabled(bootReportingScopeRef.current, reportedAttemptId),
    [],
  );
  const { quality, settings } = useSpaceVisualSettings();
  const requestedProfile = bootState.forceWebGL ? "simplified" : settings.qualityPreset;
  const [rendererGeneration, setRendererGeneration] = useState(() =>
    createRendererGeneration(attemptId, requestedProfile),
  );
  if (
    rendererGeneration.attemptId !== attemptId ||
    rendererGeneration.requestedProfile !== requestedProfile
  ) {
    setRendererGeneration(
      resolveRendererGeneration(rendererGeneration, attemptId, requestedProfile),
    );
  }
  const rendererGenerationRef = useRef(rendererGeneration);
  useLayoutEffect(() => {
    rendererGenerationRef.current = rendererGeneration;
  }, [rendererGeneration]);
  const [rendererRuntime, setRendererRuntime] = useState<{
    attemptId: number;
    requestedProfile: "full" | "simplified";
    initialPose: SpacePlayerPose | null;
    nonce: number;
    resolvedProfile: RendererProfile | null;
    error: Error | null;
  }>(() => ({
    attemptId,
    requestedProfile: bootState.forceWebGL ? "simplified" : settings.qualityPreset,
    initialPose: initialResumePose,
    nonce: rendererGeneration.nonce,
    resolvedProfile: null,
    error: null,
  }));
  const rendererScopeMatches =
    rendererRuntime.attemptId === attemptId &&
    rendererRuntime.requestedProfile === requestedProfile &&
    rendererRuntime.nonce === rendererGeneration.nonce;
  const resolvedProfile = rendererScopeMatches ? rendererRuntime.resolvedProfile : null;
  const activeRendererError = rendererScopeMatches ? rendererRuntime.error : null;

  const { entered, fading: entryIsFading } = entry;

  useEffect(() => {
    if (searchParams.get(SPACE_DAILY_RESUME_RESET_PARAM) !== "1") return;
    const next = new URLSearchParams(searchParams);
    next.delete(SPACE_DAILY_RESUME_RESET_PARAM);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    rendererOwnerMountedRef.current = true;
    return () => {
      rendererOwnerMountedRef.current = false;
      rendererLossCleanupRef.current?.();
      rendererLossCleanupRef.current = null;
    };
  }, []);

  const bootAttemptFailed = bootState.phase === "failed";
  useEffect(() => {
    return () => {
      rendererLossCleanupRef.current?.();
      rendererLossCleanupRef.current = null;
      disposeOwnedBootRenderer(ownedRendererRef);
    };
  }, [attemptId, bootAttemptFailed, requestedProfile]);

  useEffect(() => {
    const onPointerLockFailed = (event: Event) => {
      const detail = (event as SpacePointerLockFailedEvent).detail;
      const message = detail?.message ?? "";
      const permanent = detail?.permanent ?? isPermanentPointerLockFailure(message);
      if (!permanent) return;
      setPointerLockUnavailable(true);
      setToast({ key: "space.pointerLockFailed" });
    };
    window.addEventListener(SPACE_POINTER_LOCK_FAILED_EVENT, onPointerLockFailed);
    return () => window.removeEventListener(SPACE_POINTER_LOCK_FAILED_EVENT, onPointerLockFailed);
  }, []);

  useEffect(() => {
    if (!jumpHintVisible) return;
    const timer = window.setTimeout(() => setJumpHintVisible(false), JUMP_HINT_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [jumpHintVisible, jumpHintKey]);

  useEffect(() => {
    const update = () => setPointerLocked(document.pointerLockElement !== null);
    update();
    document.addEventListener("pointerlockchange", update);
    return () => document.removeEventListener("pointerlockchange", update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadManifest()
      .then((m) => {
        if (cancelled) return;
        setManifestResult({ attemptId, exhibits: m.exhibits });
        manifestResolved(
          attemptId,
          m.exhibits.filter((exhibit) => exhibit.scene).map((exhibit) => exhibit.exhibitId),
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setManifestResult({ attemptId, exhibits: [] });
        failBoot(attemptId, error);
      });
    return () => {
      cancelled = true;
    };
  }, [attemptId, failBoot, manifestResolved]);

  const handlePhysicsReady = useCallback(() => {
    if (canReportBootProgress(attemptId)) {
      milestoneReady(attemptId, "physics");
    }
  }, [attemptId, canReportBootProgress, milestoneReady]);

  const handleEnvironmentReady = useCallback(() => {
    if (canReportBootProgress(attemptId)) {
      milestoneReady(attemptId, "environment");
    }
  }, [attemptId, canReportBootProgress, milestoneReady]);

  const handleGalleryReady = useCallback(() => {
    if (canReportBootProgress(attemptId)) {
      milestoneReady(attemptId, "gallery");
    }
    onCanvasReady?.();
  }, [attemptId, canReportBootProgress, milestoneReady, onCanvasReady]);

  const handleExhibitReady = useCallback((exhibitId: string) => {
    if (canReportBootProgress(attemptId)) exhibitReady(attemptId, exhibitId);
  }, [attemptId, canReportBootProgress, exhibitReady]);

  const handleExhibitFailed = useCallback((exhibitId: string) => {
    if (canReportBootProgress(attemptId)) exhibitFailed(attemptId, exhibitId);
  }, [attemptId, canReportBootProgress, exhibitFailed]);

  const handleExhibitDeferred = useCallback((exhibitId: string) => {
    if (canReportBootProgress(attemptId)) exhibitDeferred(attemptId, exhibitId);
  }, [attemptId, canReportBootProgress, exhibitDeferred]);

  const handleBootSubtreeError = useCallback((failedAttemptId: number, error: Error) => {
    failBoot(failedAttemptId, error);
  }, [failBoot]);

  useEffect(() => {
    if (!devFocusExhibitId || manifest === null || focusedExhibitId || devFocusOpenedRef.current) return;
    const found = manifest.find((item) => item.exhibitId === devFocusExhibitId);
    if (!found) return;
    devFocusOpenedRef.current = true;
    const timer = window.setTimeout(() => {
      onNavigateToWork(found.exhibitId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [devFocusExhibitId, focusedExhibitId, manifest, onNavigateToWork]);

  const focused = focusedExhibitId
    ? manifest?.find((item) => item.exhibitId === focusedExhibitId) ?? null
    : null;

  const handleBeginDismissFocus = useCallback(
    (opts?: { fromEscape?: boolean }) => {
      flushSync(() => {
        if (!opts?.fromEscape) {
          setSuppressNextExhibitClick(true);
        }
        if (focused) setFocusClosing(focused);
      });
      onNavigateToSpace(opts);
    },
    [focused, onNavigateToSpace],
  );

  const handleFinishDismissFocus = useCallback(() => {
    setFocusClosing(null);
  }, []);

  const focusOverlayExhibit = focused ?? focusClosing;
  const invalidFocusedRoute =
    focusedExhibitId !== null && manifest !== null && focused === null && focusClosing === null;
  const onboardingFocusVisible = onboardingFocusOpen || onboardingFocusClosing;
  const focusSurfaceOpen = focusOverlayExhibit !== null || onboardingFocusVisible || invalidFocusedRoute;
  const spaceRenderPaused = focusSurfaceOpen || routeBlocked;
  const dailyResumeSavingEnabled = shouldSaveSpaceDailyResume({
    onboardingCompleted,
    restoredFromDailyResume: dailyResumePose !== null,
  });
  const canSaveDailyResume = entered && dailyResumeSavingEnabled && !focusSurfaceOpen;

  const handleSpacePoseSample = useCallback(
    (pose: SpacePlayerPose) => {
      latestSpacePoseRef.current = pose;
      const nowMs = Date.now();
      if (nowMs - lastSessionPoseSaveAtRef.current >= SPACE_DAILY_RESUME_SAVE_INTERVAL_MS) {
        writeSpaceSessionPose(undefined, pose);
        lastSessionPoseSaveAtRef.current = nowMs;
      }
      if (!canSaveDailyResume) return;
      if (nowMs - lastDailyResumeSaveAtRef.current < SPACE_DAILY_RESUME_SAVE_INTERVAL_MS) return;
      writeSpaceDailyResume(undefined, pose, new Date(nowMs));
      lastDailyResumeSaveAtRef.current = nowMs;
    },
    [canSaveDailyResume],
  );

  useEffect(() => {
    if (!canSaveDailyResume || !latestSpacePoseRef.current) return;
    const nowMs = Date.now();
    writeSpaceDailyResume(undefined, latestSpacePoseRef.current, new Date(nowMs));
    lastDailyResumeSaveAtRef.current = nowMs;
  }, [canSaveDailyResume]);

  useEffect(() => {
    const saveBeforePageHide = () => {
      flushSpacePoseOnPageHide({
        dailyResumeEnabled: dailyResumeSavingEnabled,
        pose: latestSpacePoseRef.current,
        writeDaily: (pose) => writeSpaceDailyResume(undefined, pose),
        writeSession: (pose) => writeSpaceSessionPose(undefined, pose),
      });
    };
    window.addEventListener("pagehide", saveBeforePageHide);
    return () => window.removeEventListener("pagehide", saveBeforePageHide);
  }, [dailyResumeSavingEnabled]);

  const handleBeginDismissOnboardingFocus = useCallback(
    (opts?: { fromEscape?: boolean }) => {
      flushSync(() => {
        if (!opts?.fromEscape) {
          setSuppressNextExhibitClick(true);
        }
        setOnboardingFocusOpen(false);
        setOnboardingFocusClosing(true);
      });
      if (overlay.isOverlayOpen) return;
      if (opts?.fromEscape) {
        resumeSpaceFirstPersonAfterEscape({ entered, overlayOpen: overlay.isOverlayOpen });
        return;
      }
      if (entered) resumeSpaceFirstPersonWithCursorReturn();
      else engageSpaceFirstPerson({ entered, overlayOpen: false });
    },
    [entered, overlay.isOverlayOpen],
  );

  const handleFinishDismissOnboardingFocus = useCallback(() => {
    setOnboardingFocusClosing(false);
  }, []);

  const handleFocusExhibit = useCallback(
    (id: string) => {
      if (id === SPACE_ONBOARDING_DEMO_EXHIBIT_ID) {
        flushSync(() => {
          setExhibitTarget(null);
          setOnboardingFocusClosing(false);
          setOnboardingFocusOpen(true);
        });
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        return;
      }
      if (manifest === null) {
        setToast({ key: "space.exhibitLoading" });
        return;
      }
      const found = manifest.find((e) => e.exhibitId === id);
      if (!found) {
        setToast({ key: "space.manifestMissing", values: { id } });
        return;
      }
      flushSync(() => {
        setExhibitTarget(null);
      });
      onNavigateToWork(found.exhibitId);
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    },
    [manifest, onNavigateToWork],
  );

  const isHovering = exhibitTarget !== null && !focusSurfaceOpen;
  const pointerControlsEnabled =
    (entry.showSplash || entryIsFading || entered) &&
    !overlay.isOverlayOpen &&
    !focusSurfaceOpen &&
    !pointerLockUnavailable;
  const controlsEnabled =
    (entryIsFading || entered) &&
    !overlay.isOverlayOpen &&
    !focusSurfaceOpen &&
    !pointerLockUnavailable;
  const onboardingEnabled =
    entered && !pointerLockUnavailable && dailyResumePose === null && !onboardingCompleted;
  const projectorHintVisible =
    pointerLocked &&
    controlsEnabled &&
    !onboardingEnabled &&
    exhibitTarget?.interactionKind === "projector";

  const requestProjectorSlide = useCallback((direction: ProjectorSlideDirection) => {
    setProjectorSlideCommand({
      nonce: ++projectorSlideCommandNonceRef.current,
      direction,
    });
  }, []);

  useEffect(() => {
    if (!projectorHintVisible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.code === "KeyE") {
        event.preventDefault();
        requestProjectorSlide("next");
      }
      if (event.code === "KeyQ") {
        event.preventDefault();
        requestProjectorSlide("previous");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [projectorHintVisible, requestProjectorSlide]);

  const handleEmptyClick = useCallback(() => {
    if (!controlsEnabled) return;
    setCrosshairPulseNonce((n) => n + 1);
  }, [controlsEnabled]);

  const handleConsumeSuppressedClick = useCallback(() => {
    if (suppressNextExhibitClick) setSuppressNextExhibitClick(false);
  }, [suppressNextExhibitClick]);

  const handleJumpNotice = useCallback((messageKey: SpaceJumpNoticeKey) => {
    setJumpHintKey(messageKey);
    setJumpHintVisible(true);
  }, []);
  const jumpHintMessage = jumpHintKey ? t(jumpHintKey) : "";
  const toastMessage = toast ? (toast.values ? t(toast.key, toast.values) : t(toast.key)) : null;

  const hud = useMemo(
    () => (
      <>
        <JumpHint message={jumpHintMessage} visible={jumpHintVisible} />
        <ProjectorControlsHint visible={projectorHintVisible} />
        {pointerLocked ? <Crosshair isHovering={isHovering} pulseNonce={crosshairPulseNonce} /> : null}
      </>
    ),
    [
      crosshairPulseNonce,
      isHovering,
      jumpHintMessage,
      jumpHintVisible,
      pointerLocked,
      projectorHintVisible,
    ],
  );

  const useShadows = !ENABLE_GALLERY_GLB || ENABLE_GALLERY_RUNTIME_SHADOWS;

  return (
    <>
      <SpaceCursorOverlay
        enabled
        entered={entered}
        overlayOpen={overlay.isOverlayOpen}
        focusOpen={focusSurfaceOpen}
      />
      <SpaceMovementDebugOverlay />
      <Toast
        message={toastMessage}
        durationMs={toast?.key === "space.pointerLockFailed" ? 5200 : 2200}
        onDone={() => setToast(null)}
      />
      {hud}
      <PlaybackBar elevated={focusSurfaceOpen} />
      {invalidFocusedRoute ? (
        <main
          className="focus-overlay"
          data-work-route-not-found="true"
          role="main"
          style={{ display: "grid", placeItems: "center" }}
        >
          <button type="button" className="focus-return-button focus-return-button--visible" onClick={() => onNavigateToSpace()}>
            {t("route.invalidWorkReturn")}
          </button>
        </main>
      ) : null}
      {focusOverlayExhibit && resolvedProfile ? (
        <Suspense fallback={null}>
          <FocusOverlay
            key={focusOverlayExhibit.exhibitId}
            exhibit={focusOverlayExhibit}
            profile={resolvedProfile.id}
            onBeginDismiss={handleBeginDismissFocus}
            onClose={handleFinishDismissFocus}
          />
        </Suspense>
      ) : null}
      {onboardingFocusVisible ? (
        <SpaceOnboardingFocusDemo
          onBeginDismiss={handleBeginDismissOnboardingFocus}
          onClose={handleFinishDismissOnboardingFocus}
        />
      ) : null}
      <BootAttemptErrorBoundary attemptId={attemptId} onError={handleBootSubtreeError}>
        {rendererRuntime.error && rendererScopeMatches ? (
          <WebGPUUnavailable />
        ) : bootState.phase === "failed" ? null : (
          <div
            className={`space-canvasWrap${entered ? "" : " space-canvasWrap--entry"}${entryIsFading ? " space-canvasWrap--entryFading" : ""}${spaceRenderPaused ? " space-canvasWrap--disabled" : ""}`}
          >
            <Canvas
              key={`space-canvas-${attemptId}-${requestedProfile}`}
              frameloop={spaceRenderPaused ? "never" : "always"}
              id="space-canvas"
              style={{ position: "absolute", inset: 0 }}
              dpr={resolveRendererDpr(resolvedProfile)}
              gl={(props) =>
                bridgeRendererInitialization(
                  createWebGPURenderer({
                    canvas: props.canvas as HTMLCanvasElement,
                    requestedProfile,
                    onResolved: (resolution) => {
                      runForActiveRendererGeneration(
                        rendererGenerationRef.current,
                        rendererGeneration,
                        () => {
                          setRendererRuntime((current) => {
                            if (!runForActiveRendererGeneration(
                              rendererGenerationRef.current,
                              rendererGeneration,
                              () => undefined,
                            )) return current;
                            const switched = switchRendererProfileState(
                              current,
                              requestedProfile,
                              latestSpacePoseRef.current ?? initialResumePose,
                            );
                            return {
                              ...switched,
                              attemptId,
                              requestedProfile,
                              nonce: rendererGeneration.nonce,
                              initialPose: latestSpacePoseRef.current ?? initialResumePose,
                              resolvedProfile: RENDERER_PROFILES[resolution.profile],
                              error: null,
                            };
                          });
                          if (canReportBootProgress(attemptId)) {
                            milestoneReady(attemptId, "renderer");
                          }
                        },
                      );
                    },
                  }).then((renderer) => {
                    if (!runForActiveRendererGeneration(
                      rendererGenerationRef.current,
                      rendererGeneration,
                      () => undefined,
                    )) {
                      renderer.dispose();
                      throw new Error("Renderer initialization superseded by a newer generation");
                    }
                    replaceWatchedBootRenderer(
                      ownedRendererRef,
                      rendererLossCleanupRef,
                      renderer,
                    );
                    rendererLossCleanupRef.current = watchRendererDeviceLoss(
                      renderer,
                      props.canvas as HTMLCanvasElement,
                      (error) => {
                        runForActiveRendererGeneration(
                          rendererGenerationRef.current,
                          rendererGeneration,
                          () => deviceLost(attemptId, error),
                        );
                      },
                    );
                    return renderer;
                  }),
                  (error) => {
                    if (!runForActiveRendererGeneration(
                      rendererGenerationRef.current,
                      rendererGeneration,
                      () => undefined,
                    )) return;
                    reportRendererInitializationErrorIfMounted(
                      () => rendererOwnerMountedRef.current,
                      (reportedError) => {
                        if (!runForActiveRendererGeneration(
                          rendererGenerationRef.current,
                          rendererGeneration,
                          () => undefined,
                        )) return;
                        setRendererRuntime((current) =>
                          current.attemptId === attemptId &&
                          current.requestedProfile === requestedProfile &&
                          current.nonce === rendererGeneration.nonce
                            ? {
                                ...current,
                                error:
                                  reportedError instanceof Error
                                    ? reportedError
                                    : new Error("Renderer initialization failed"),
                              }
                            : current,
                        );
                        failBoot(attemptId, reportedError);
                      },
                      error,
                    );
                  },
                )
              }
              camera={{
                fov: 70,
                near: 0.01,
                far: 200,
                position: ENABLE_GALLERY_GLB ? spawnToCameraPosition(GALLERY_SPAWN) : [0, 1.6, 6],
              }}
              shadows={resolvedProfile ? resolvedProfile.shadows && useShadows : false}
              onCreated={({ gl }) => {
                gl.domElement.id = "space-canvas";
              }}
            >
              {resolvedProfile ? (
                <>
                  <color attach="background" args={[GALLERY_TOON.background]} />
                  {ENABLE_GALLERY_TOON &&
                  resolvedProfile.expensiveLeaves.galleryAtmosphere ? (
                    <GalleryAtmosphere />
                  ) : null}
                  <ambientLight
                    intensity={ENABLE_GALLERY_TOON ? GALLERY_TOON.ambientIntensity : 0.42}
                  />
                  {ENABLE_GALLERY_TOON ? (
                    <>
                      <directionalLight
                        position={GALLERY_TOON.keyLight.position}
                        intensity={GALLERY_TOON.keyLight.intensity}
                        color={GALLERY_TOON.keyLight.color}
                      />
                      <directionalLight
                        position={GALLERY_TOON.fillLight.position}
                        intensity={GALLERY_TOON.fillLight.intensity}
                        color={GALLERY_TOON.fillLight.color}
                      />
                    </>
                  ) : null}
                  <hemisphereLight
                    args={
                  ENABLE_GALLERY_TOON
                    ? [GALLERY_TOON.hemisphere.sky, GALLERY_TOON.hemisphere.ground, GALLERY_TOON.hemisphere.intensity]
                    : ["#e8eef5", "#8a8078", 0.35]
                    }
                  />
                  <Suspense
                    fallback={
                      <group>
                        <mesh position={[0, 1.6, 0]}>
                          <boxGeometry args={[0.8, 0.2, 0.8]} />
                          <meshToonMaterial color="#7a7a7a" />
                        </mesh>
                      </group>
                    }
                  >
                    <Physics gravity={[0, -9.81, 0]} timeStep={SPACE_PHYSICS_TIME_STEP}>
                      <PhysicsBootBoundary onReady={handlePhysicsReady} />
                      <SpaceScene
                    exhibitTarget={exhibitTarget}
                    onTargetChange={setExhibitTarget}
                    loadExhibits={loadExhibits}
                    projectorExhibits={manifest}
                    onEnvironmentReady={handleEnvironmentReady}
                    onGalleryReady={handleGalleryReady}
                    onExhibitReady={handleExhibitReady}
                    onExhibitFailed={handleExhibitFailed}
                    onExhibitDeferred={handleExhibitDeferred}
                    pointerControlsEnabled={pointerControlsEnabled}
                    controlsEnabled={controlsEnabled}
                    projectorCommand={projectorSlideCommand}
                    onFocusExhibit={handleFocusExhibit}
                    onEmptyClick={handleEmptyClick}
                    suppressNextClick={suppressNextExhibitClick}
                    onConsumeSuppressedClick={handleConsumeSuppressedClick}
                    onJumpNotice={handleJumpNotice}
                    onboardingEnabled={onboardingEnabled}
                    pointerLocked={pointerLocked}
                    onboardingFocusVisible={onboardingFocusVisible}
                    initialPose={rendererRuntime.initialPose}
                    onPoseSample={handleSpacePoseSample}
                    onOnboardingCompleted={() => setOnboardingCompleted(true)}
                    quality={quality}
                      />
                    </Physics>
                    {resolvedProfile.postProcessing ? (
                      <GalleryRenderPipeline bloom={quality.post.bloom} />
                    ) : null}
                  </Suspense>
                </>
              ) : null}
            </Canvas>
            {resolvedProfile === null && !activeRendererError ? (
              <div
                role="status"
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 25,
                  display: "grid",
                  placeItems: "center",
                  background: "#050505",
                  color: "rgba(255,255,255,0.75)",
                  fontFamily: "system-ui",
                  fontSize: 13,
                  letterSpacing: "0.06em",
                  pointerEvents: "none",
                }}
              >
                <span>
                  {t("space.loading")}
                  <span className="space-renderer-loading-indicator" aria-hidden>•••</span>
                </span>
                {bootState.phase === "booting" && bootState.items.total > 0 ? (
                  <span>{bootState.items.loaded + bootState.items.failed + bootState.items.deferred}/{bootState.items.total}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </BootAttemptErrorBoundary>
      {bootState.phase === "failed" ? (
        <SpaceBootFailure error={bootState.error} onRetry={retryBoot} />
      ) : null}
    </>
  );
}
