import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
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
import { isWebGPUSupported } from "../rendering/webgpuSupport";
import { WebGPUErrorBoundary } from "../rendering/WebGPUErrorBoundary";
import { WebGPUUnavailable } from "../rendering/WebGPUUnavailable";
import { SpaceMovementDebugOverlay } from "../scenes/debug/SpaceMovementDebugOverlay";
import { SpaceScene } from "../scenes/SpaceScene";
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

import {
  SPACE_POINTER_LOCK_FAILED_EVENT,
  engageSpaceFirstPerson,
  resumeSpaceFirstPersonAfterEscape,
  resumeSpaceFirstPersonWithCursorReturn,
} from "../space/requestSpacePointerLock";
import { isPermanentPointerLockFailure } from "../space/pointerLockFailure";

const FocusOverlay = lazy(() =>
  import("../exhibits/FocusOverlay").then((module) => ({
    default: module.FocusOverlay,
  })),
);

const JUMP_HINT_VISIBLE_MS = 5000;
const SPACE_PHYSICS_TIME_STEP = 1 / 60;

type SpacePointerLockFailedEvent = CustomEvent<{
  message: string;
  permanent?: boolean;
}>;

function JumpHint({ message, visible }: { message: string; visible: boolean }) {
  if (!visible || !message) return null;
  return <div className="jump-hint">{message}</div>;
}

export function SpaceDesktopExperience({
  entry,
  overlay,
  loadExhibits,
  onSceneExhibitsReady,
  onCanvasReady,
}: {
  entry: EntryTransition;
  overlay: { isOverlayOpen: boolean };
  loadExhibits: boolean;
  onSceneExhibitsReady: () => void;
  onCanvasReady?: () => void;
}) {
  const [exhibitTarget, setExhibitTarget] = useState<ExhibitTarget | null>(null);
  const [webgpuReady, setWebgpuReady] = useState<boolean | null>(null);
  const { t } = useTranslation();
  const [manifest, setManifest] = useState<ExhibitManifestItem[] | null>(null);
  const [focused, setFocused] = useState<ExhibitManifestItem | null>(null);
  /** 退出动效期间仍挂载 Focus，但已恢复 SPACE 第一人称控制 */
  const [focusClosing, setFocusClosing] = useState<ExhibitManifestItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [crosshairPulseNonce, setCrosshairPulseNonce] = useState(0);
  const [suppressNextExhibitClick, setSuppressNextExhibitClick] = useState(false);
  const [jumpHintMessage, setJumpHintMessage] = useState("");
  const [jumpHintVisible, setJumpHintVisible] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [pointerLockUnavailable, setPointerLockUnavailable] = useState(false);
  const [onboardingFocusOpen, setOnboardingFocusOpen] = useState(false);
  const [onboardingFocusClosing, setOnboardingFocusClosing] = useState(false);

  const { entered, fading: entryIsFading } = entry;

  useEffect(() => {
    const onPointerLockFailed = (event: Event) => {
      const detail = (event as SpacePointerLockFailedEvent).detail;
      const message = detail?.message ?? "";
      const permanent = detail?.permanent ?? isPermanentPointerLockFailure(message);
      if (!permanent) return;
      setPointerLockUnavailable(true);
      setToast(t("space.pointerLockFailed"));
    };
    window.addEventListener(SPACE_POINTER_LOCK_FAILED_EVENT, onPointerLockFailed);
    return () => window.removeEventListener(SPACE_POINTER_LOCK_FAILED_EVENT, onPointerLockFailed);
  }, [t]);

  useEffect(() => {
    if (!jumpHintVisible) return;
    const timer = window.setTimeout(() => setJumpHintVisible(false), JUMP_HINT_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [jumpHintVisible, jumpHintMessage]);

  useEffect(() => {
    const update = () => setPointerLocked(document.pointerLockElement !== null);
    update();
    document.addEventListener("pointerlockchange", update);
    return () => document.removeEventListener("pointerlockchange", update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    isWebGPUSupported().then((ok) => {
      if (!cancelled) setWebgpuReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadManifest()
      .then((m) => {
        if (!cancelled) setManifest(m.exhibits);
      })
      .catch(() => {
        if (!cancelled) setManifest([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBeginDismissFocus = useCallback(
    (opts?: { fromEscape?: boolean }) => {
      flushSync(() => {
        if (!opts?.fromEscape) {
          setSuppressNextExhibitClick(true);
        }
        setFocused((current) => {
          if (current) setFocusClosing(current);
          return null;
        });
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

  const handleFinishDismissFocus = useCallback(() => {
    setFocusClosing(null);
  }, []);

  const focusOverlayExhibit = focused ?? focusClosing;
  const onboardingFocusVisible = onboardingFocusOpen || onboardingFocusClosing;
  const focusSurfaceOpen = focusOverlayExhibit !== null || onboardingFocusVisible;

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
        setToast("展品信息加载中…");
        return;
      }
      const found = manifest.find((e) => e.exhibitId === id);
      if (!found) {
        setToast(`manifest 无此展品: ${id}`);
        return;
      }
      flushSync(() => {
        setExhibitTarget(null);
        setFocused(found);
      });
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    },
    [manifest],
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

  const handleEmptyClick = useCallback(() => {
    if (!controlsEnabled) return;
    setCrosshairPulseNonce((n) => n + 1);
    if (!document.pointerLockElement) {
      resumeSpaceFirstPersonWithCursorReturn();
    }
  }, [controlsEnabled]);

  const handleConsumeSuppressedClick = useCallback(() => {
    if (suppressNextExhibitClick) setSuppressNextExhibitClick(false);
  }, [suppressNextExhibitClick]);

  const handleJumpNotice = useCallback((message: string) => {
    setJumpHintMessage(message);
    setJumpHintVisible(true);
  }, []);

  const hud = useMemo(
    () => (
      <>
        <JumpHint message={jumpHintMessage} visible={jumpHintVisible} />
        {pointerLocked ? <Crosshair isHovering={isHovering} pulseNonce={crosshairPulseNonce} /> : null}
      </>
    ),
    [crosshairPulseNonce, isHovering, jumpHintMessage, jumpHintVisible, pointerLocked],
  );

  const useShadows = !ENABLE_GALLERY_GLB || ENABLE_GALLERY_RUNTIME_SHADOWS;
  const canRender3d = webgpuReady === true;

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
        message={toast}
        durationMs={toast === t("space.pointerLockFailed") ? 5200 : 2200}
        onDone={() => setToast(null)}
      />
      {hud}
      <PlaybackBar elevated={focusSurfaceOpen} />
      {webgpuReady === null ? (
        <div
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
          }}
        >
          {t("space.loading", { defaultValue: "正在初始化 WebGPU…" })}
        </div>
      ) : null}
      {webgpuReady === false ? <WebGPUUnavailable /> : null}
      {focusOverlayExhibit ? (
        <Suspense fallback={null}>
          <FocusOverlay
            key={focusOverlayExhibit.exhibitId}
            exhibit={focusOverlayExhibit}
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
      {canRender3d ? (
        <WebGPUErrorBoundary>
          <div
            className={`space-canvasWrap${entered ? "" : " space-canvasWrap--entry"}${entryIsFading ? " space-canvasWrap--entryFading" : ""}${focusSurfaceOpen ? " space-canvasWrap--disabled" : ""}`}
          >
            <Canvas
              id="space-canvas"
              style={{ position: "absolute", inset: 0 }}
              gl={(props) =>
                createWebGPURenderer({
                  canvas: props.canvas as HTMLCanvasElement,
                  antialias: props.antialias,
                })
              }
              camera={{
                fov: 70,
                near: 0.01,
                far: 200,
                position: ENABLE_GALLERY_GLB ? spawnToCameraPosition(GALLERY_SPAWN) : [0, 1.6, 6],
              }}
              shadows={useShadows}
              onCreated={({ gl }) => {
                gl.domElement.id = "space-canvas";
              }}
            >
              <color attach="background" args={[GALLERY_TOON.background]} />
              {ENABLE_GALLERY_TOON ? <GalleryAtmosphere /> : null}
              <ambientLight intensity={ENABLE_GALLERY_TOON ? GALLERY_TOON.ambientIntensity : 0.42} />
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
                  <SpaceScene
                    exhibitTarget={exhibitTarget}
                    onTargetChange={setExhibitTarget}
                    loadExhibits={loadExhibits}
                    onSceneExhibitsReady={onSceneExhibitsReady}
                    onSceneReady={onCanvasReady}
                    pointerControlsEnabled={pointerControlsEnabled}
                    controlsEnabled={controlsEnabled}
                    onFocusExhibit={handleFocusExhibit}
                    onEmptyClick={handleEmptyClick}
                    suppressNextClick={suppressNextExhibitClick}
                    onConsumeSuppressedClick={handleConsumeSuppressedClick}
                    onJumpNotice={handleJumpNotice}
                    onboardingEnabled={entered && !pointerLockUnavailable}
                    pointerLocked={pointerLocked}
                    onboardingFocusVisible={onboardingFocusVisible}
                  />
                </Physics>
                <GalleryRenderPipeline />
              </Suspense>
            </Canvas>
          </div>
        </WebGPUErrorBoundary>
      ) : null}
    </>
  );
}
