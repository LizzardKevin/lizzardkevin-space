import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { ExhibitTarget } from "../exhibits/exhibitTarget";
import { loadManifest } from "../exhibits/manifest";
import type { ExhibitManifestItem } from "../exhibits/manifest";
import type { SpaceJumpNoticeKey } from "../scenes/Player/PlayerController";
import type { ProjectorSlideCommand, ProjectorSlideDirection } from "../scenes/projector/projectorSlides";
import { SPACE_ONBOARDING_DEMO_EXHIBIT_ID } from "../scenes/onboarding/spaceOnboardingConfig";
import { SpaceOnboardingFocusDemo } from "../scenes/onboarding/SpaceOnboardingFocusDemo";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { SpaceCanvasHost } from "../space/SpaceCanvasHost";
import { SpaceHud } from "../space/SpaceHud";

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
import { clearSpaceSessionPose, readSpaceSessionPose, writeSpaceSessionPose } from "../space/spaceSessionPose";
import { flushSpacePoseOnPageHide } from "../space/spacePosePageHide";
import { spaceExplorationStore } from "../space/quests/spaceQuests";
import {
  fetchExhibitContentSummary,
  pickExhibitLocalizedText,
} from "../space/exhibitContentSummary";
import type { SpaceBootController } from "../boot/useSpaceBootController";

/** 探索提示的 pose 事件节流:≤10Hz,不进 React state。 */
const SPACE_EXPLORATION_POSE_INTERVAL_MS = 100;

const JUMP_HINT_VISIBLE_MS = 5000;
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

function readInitialDailyResumePose(params: URLSearchParams) {
  if (params.get(SPACE_DAILY_RESUME_RESET_PARAM) === "1") {
    clearSpaceDailyResume();
    // 会话位姿(sessionStorage)同样决定 onboardingCompleted;只清 daily resume
    // 无法真正重走 onboarding,必须一并清掉。
    clearSpaceSessionPose();
    return null;
  }
  return readSpaceDailyResume();
}

function readDevFocusExhibitId(params: URLSearchParams) {
  if (!import.meta.env.DEV) return null;
  return params.get(SPACE_DEBUG_FOCUS_PARAM);
}

export function SpaceDesktopExperience({
  boot,
  entered,
  overlay,
  loadExhibits,
  onNavigateToWork,
  onCanvasReady,
  routeBlocked,
}: {
  boot: SpaceBootController;
  entered: boolean;
  overlay: { isOverlayOpen: boolean };
  loadExhibits: boolean;
  onNavigateToWork: (exhibitId: string) => void;
  onCanvasReady?: () => void;
  routeBlocked: boolean;
}) {
  const {
    state: bootState,
    retry: retryBoot,
    manifestResolved,
    fail: failBoot,
  } = boot;
  const attemptId = bootState.attemptId;
  const [exhibitTarget, setExhibitTarget] = useState<ExhibitTarget | null>(null);
  const { t, i18n } = useTranslation();
  const [manifestResult, setManifestResult] = useState<{
    attemptId: number;
    exhibits: ExhibitManifestItem[];
  } | null>(null);
  const manifest = manifestResult?.attemptId === attemptId ? manifestResult.exhibits : null;
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
  const lastExplorationPoseAtRef = useRef(0);
  const latestSpacePoseRef = useRef<SpacePlayerPose | null>(initialResumePose);
  const lastDailyResumeSaveAtRef = useRef(0);
  const lastSessionPoseSaveAtRef = useRef(0);
  const projectorSlideCommandNonceRef = useRef(0);
  const devFocusOpenedRef = useRef(false);
  useEffect(() => {
    if (searchParams.get(SPACE_DAILY_RESUME_RESET_PARAM) !== "1") return;
    const next = new URLSearchParams(searchParams);
    next.delete(SPACE_DAILY_RESUME_RESET_PARAM);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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

  useEffect(() => {
    if (!devFocusExhibitId || manifest === null || devFocusOpenedRef.current) return;
    const found = manifest.find((item) => item.exhibitId === devFocusExhibitId);
    if (!found) return;
    devFocusOpenedRef.current = true;
    const timer = window.setTimeout(() => {
      onNavigateToWork(found.exhibitId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [devFocusExhibitId, manifest, onNavigateToWork]);

  const onboardingFocusVisible = onboardingFocusOpen || onboardingFocusClosing;
  const focusSurfaceOpen = onboardingFocusVisible;
  const spaceRenderPaused = focusSurfaceOpen || routeBlocked;
  const dailyResumeSavingEnabled = shouldSaveSpaceDailyResume({
    onboardingCompleted,
    restoredFromDailyResume: dailyResumePose !== null,
  });
  const canSaveDailyResume = entered && dailyResumeSavingEnabled && !focusSurfaceOpen;

  // 探索提示:新手引导完成 → armed;从 Lobby 重新进入 → 重置待重抽
  useEffect(() => {
    if (onboardingCompleted) spaceExplorationStore.notifyOnboardingCompleted();
  }, [onboardingCompleted]);

  const prevEnteredRef = useRef(entered);
  const hasEnteredOnceRef = useRef(false);
  useEffect(() => {
    if (entered && !prevEnteredRef.current) {
      // 仅“从 Lobby 返回后再进”才算会话重开;页面加载后的首次进入不打断恢复状态。
      if (hasEnteredOnceRef.current) spaceExplorationStore.notifySessionRestart();
      hasEnteredOnceRef.current = true;
    }
    prevEnteredRef.current = entered;
  }, [entered]);

  // 静止任务的外部重置:失焦 / 打开 Overlay 或 Focus / 解除控制
  useEffect(() => {
    const reset = () => spaceExplorationStore.dispatch({ type: "stillness-reset" }, Date.now());
    window.addEventListener("blur", reset);
    return () => window.removeEventListener("blur", reset);
  }, []);

  useEffect(() => {
    if (overlay.isOverlayOpen || focusSurfaceOpen || !pointerLocked) {
      spaceExplorationStore.dispatch({ type: "stillness-reset" }, Date.now());
    }
  }, [overlay.isOverlayOpen, focusSurfaceOpen, pointerLocked]);

  // 展品注视目标(仅展品,不含投影仪)
  useEffect(() => {
    spaceExplorationStore.dispatch(
      {
        type: "work-targeted",
        exhibitId:
          exhibitTarget?.interactionKind === "exhibit" ? exhibitTarget.exhibitId : null,
      },
      Date.now(),
    );
  }, [exhibitTarget]);

  // 悬停展品的 title/subtitle:按需拉 content.json;目标丢失/更换在渲染期过滤
  const [exhibitHint, setExhibitHint] = useState<{
    exhibitId: string;
    title: string;
    subtitle: string;
  } | null>(null);
  useEffect(() => {
    const target = exhibitTarget?.interactionKind === "exhibit" ? exhibitTarget : null;
    if (!target) return;
    let cancelled = false;
    const language = i18n.resolvedLanguage ?? i18n.language;
    fetchExhibitContentSummary(target.exhibitId).then((summary) => {
      if (cancelled || !summary) return;
      setExhibitHint({
        exhibitId: target.exhibitId,
        title: pickExhibitLocalizedText(summary.title, language),
        subtitle: pickExhibitLocalizedText(summary.subtitle, language),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [exhibitTarget, i18n.resolvedLanguage, i18n.language]);
  const exhibitHintForTarget =
    exhibitHint &&
    exhibitTarget?.interactionKind === "exhibit" &&
    exhibitHint.exhibitId === exhibitTarget.exhibitId
      ? exhibitHint
      : null;

  const handleSpacePoseSample = useCallback(
    (pose: SpacePlayerPose) => {
      latestSpacePoseRef.current = pose;
      const nowMs = Date.now();
      if (nowMs - lastExplorationPoseAtRef.current >= SPACE_EXPLORATION_POSE_INTERVAL_MS) {
        lastExplorationPoseAtRef.current = nowMs;
        spaceExplorationStore.maybeActivateAt(pose.position);
        spaceExplorationStore.dispatch(
          {
            type: "pose-sampled",
            position: pose.position,
            yawRad: pose.yawRad,
            pitchRad: pose.pitchRad,
          },
          nowMs,
        );
      }
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
      spaceExplorationStore.dispatch({ type: "work-opened", exhibitId: found.exhibitId }, Date.now());
      onNavigateToWork(found.exhibitId);
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    },
    [manifest, onNavigateToWork],
  );

  const isHovering = exhibitTarget !== null && !focusSurfaceOpen;
  const pointerControlsEnabled =
    entered &&
    !overlay.isOverlayOpen &&
    !focusSurfaceOpen &&
    !pointerLockUnavailable;
  const controlsEnabled =
    entered &&
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
    if (messageKey === "space.jumpUnlocked") {
      spaceExplorationStore.dispatch({ type: "jump-unlocked" }, Date.now());
    }
    setJumpHintKey(messageKey);
    setJumpHintVisible(true);
  }, []);
  const jumpHintMessage = jumpHintKey ? t(jumpHintKey) : "";
  const toastMessage = toast ? (toast.values ? t(toast.key, toast.values) : t(toast.key)) : null;

  return (
    <>
      <SpaceCanvasHost
        boot={boot}
        paused={spaceRenderPaused}
        initialPose={initialResumePose}
        latestPoseRef={latestSpacePoseRef}
        onCanvasReady={onCanvasReady}
        session={{
          exhibitTarget,
          onTargetChange: setExhibitTarget,
          loadExhibits,
          projectorExhibits: manifest,
          pointerControlsEnabled,
          controlsEnabled,
          projectorCommand: projectorSlideCommand,
          onFocusExhibit: handleFocusExhibit,
          onEmptyClick: handleEmptyClick,
          suppressNextClick: suppressNextExhibitClick,
          onConsumeSuppressedClick: handleConsumeSuppressedClick,
          onJumpNotice: handleJumpNotice,
          onboardingEnabled,
          pointerLocked,
          onboardingFocusVisible,
          onPoseSample: handleSpacePoseSample,
          onOnboardingCompleted: () => setOnboardingCompleted(true),
        }}
        renderSurfaces={({ error, loading }) => (
          <>
            {onboardingFocusVisible ? (
              <SpaceOnboardingFocusDemo
                onBeginDismiss={handleBeginDismissOnboardingFocus}
                onClose={handleFinishDismissOnboardingFocus}
              />
            ) : null}
            <SpaceHud
              entered={entered}
              overlayOpen={overlay.isOverlayOpen}
              focusOpen={focusSurfaceOpen}
              pointerLocked={pointerLocked}
              isHovering={isHovering}
              crosshairPulseNonce={crosshairPulseNonce}
              jumpHintMessage={jumpHintMessage}
              jumpHintVisible={jumpHintVisible}
              projectorHintVisible={projectorHintVisible}
              toastMessage={toastMessage}
              toastDurationMs={toast?.key === "space.pointerLockFailed" ? 5200 : 2200}
              onToastDone={() => setToast(null)}
              rendererFailed={error !== null}
              rendererLoading={loading}
              poseRef={latestSpacePoseRef}
              onboardingCompleted={onboardingCompleted}
              routeBlocked={routeBlocked}
              exhibitHint={exhibitHintForTarget}
              loadedItems={
                bootState.items.loaded + bootState.items.failed + bootState.items.deferred
              }
              totalItems={bootState.phase === "booting" ? bootState.items.total : 0}
              bootFailed={bootState.phase === "failed"}
              bootError={bootState.error}
              onRetryBoot={retryBoot}
            />
          </>
        )}
      />
    </>
  );
}
