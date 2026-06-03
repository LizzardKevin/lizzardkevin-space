import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAudioDirector } from "../audio/useAudioDirector";
import { Crosshair } from "../components/Crosshair";
import { Toast } from "../components/Toast";
import { SpaceScene } from "../scenes/SpaceScene";
import { ENABLE_GALLERY_GLB, ENABLE_GALLERY_RUNTIME_SHADOWS, ENABLE_GALLERY_TOON, GALLERY_SPAWN, GALLERY_TOON } from "../scenes/gallery/galleryConfig";
import { GalleryAtmosphere } from "../scenes/gallery/GalleryAtmosphere";
import { spawnToCameraPosition } from "../scenes/gallery/resolveGallerySpawn";
import { useTranslation } from "react-i18next";
import { FocusOverlay } from "../exhibits/FocusOverlay";
import type { ExhibitTarget } from "../exhibits/exhibitTarget";
import { loadManifest } from "../exhibits/manifest";
import type { ExhibitManifestItem } from "../exhibits/manifest";
import { PlaybackBar } from "../media/PlaybackBar";
import { createWebGPURenderer } from "../rendering/createWebGPURenderer";
import { GalleryRenderPipeline } from "../rendering/GalleryRenderPipeline";
import { isWebGPUSupported } from "../rendering/webgpuSupport";
import { WebGPUErrorBoundary } from "../rendering/WebGPUErrorBoundary";
import { WebGPUUnavailable } from "../rendering/WebGPUUnavailable";

function requestSpacePointerLock() {
  requestAnimationFrame(() => {
    const canvas = document.getElementById("space-canvas") as HTMLCanvasElement | null;
    canvas?.requestPointerLock?.();
  });
}

export function SpacePage({ overlay }: { overlay: { isOverlayOpen: boolean } }) {
  const [exhibitTarget, setExhibitTarget] = useState<ExhibitTarget | null>(null);
  const [entered, setEntered] = useState(false);
  const [entryIsFading, setEntryIsFading] = useState(false);
  const [entryHideButton, setEntryHideButton] = useState(false);
  const [webgpuReady, setWebgpuReady] = useState<boolean | null>(null);
  const audio = useAudioDirector();
  const { t } = useTranslation();
  const [manifest, setManifest] = useState<ExhibitManifestItem[] | null>(null);
  const [focused, setFocused] = useState<ExhibitManifestItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [crosshairPulseNonce, setCrosshairPulseNonce] = useState(0);
  const [suppressNextExhibitClick, setSuppressNextExhibitClick] = useState(false);
  const enterWrapRef = useRef<HTMLDivElement>(null);

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

  const handleCloseFocus = useCallback(() => {
    setFocused(null);
    // 退出 Focus 后用户需要点一次左键才能重新获取 pointer lock；
    // 这一次点击不应触发再次进入 Focus。
    setSuppressNextExhibitClick(true);
    if (entered && !overlay.isOverlayOpen) {
      requestSpacePointerLock();
    }
  }, [entered, overlay.isOverlayOpen]);

  const handleFocusExhibit = useCallback(
    (id: string) => {
      if (manifest === null) {
        setToast("展品信息加载中…");
        return;
      }
      const found = manifest.find((e) => e.exhibitId === id);
      if (!found) {
        setToast(`manifest 无此展品: ${id}`);
        return;
      }
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      setExhibitTarget(null);
      setFocused(found);
    },
    [manifest],
  );

  const isHovering = exhibitTarget !== null && !focused;
  const spaceOperable = entered || entryIsFading;
  const controlsEnabled = spaceOperable && !overlay.isOverlayOpen && !focused;

  const handleEmptyClick = useCallback(() => {
    if (!controlsEnabled) return;
    if (suppressNextExhibitClick) {
      setSuppressNextExhibitClick(false);
      return;
    }
    // 未锁定时空点左键由 PointerLockControls 用于重新进入第一人称，不播准星脉冲
    if (!document.pointerLockElement) return;
    setCrosshairPulseNonce((n) => n + 1);
  }, [controlsEnabled, suppressNextExhibitClick]);

  const handleConsumeSuppressedClick = useCallback(() => {
    if (suppressNextExhibitClick) setSuppressNextExhibitClick(false);
  }, [suppressNextExhibitClick]);

  const hud = useMemo(
    () => (
      <>
        <Crosshair isHovering={isHovering} pulseNonce={crosshairPulseNonce} />
      </>
    ),
    [crosshairPulseNonce, isHovering],
  );

  const useShadows = !ENABLE_GALLERY_GLB || ENABLE_GALLERY_RUNTIME_SHADOWS;
  const canRender3d = webgpuReady === true;

  return (
    <div style={{ height: "100vh", width: "100vw", background: "#ffffff" }}>
      <Toast message={toast} onDone={() => setToast(null)} />
      {hud}
      <PlaybackBar />
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
      {focused ? <FocusOverlay exhibit={focused} onClose={handleCloseFocus} /> : null}
      {!entered && canRender3d && (
        <div
          className={`space-splash${entryIsFading ? " space-splash--fading" : ""}`}
          onTransitionEnd={(e) => {
            if (e.target !== e.currentTarget) return;
            if (!entryIsFading) return;
            setEntered(true);
            setEntryIsFading(false);
          }}
        >
          <div
            ref={enterWrapRef}
            className={`space-enterButtonWrap${entryHideButton ? " space-enterButtonWrap--hide" : ""}`}
          >
            <button
              type="button"
              onClick={() => {
                const wrap = enterWrapRef.current;
                if (wrap) {
                  const tr = getComputedStyle(wrap).transform;
                  if (tr && tr !== "none") {
                    const y = new DOMMatrix(tr).m42;
                    wrap.style.setProperty("--enter-float-y", `${y}px`);
                    wrap.style.transform = `translateY(${y}px)`;
                  }
                  wrap.style.animation = "none";
                }
                audio.unlock();
                void audio.setZone("architecture");
                setEntryHideButton(true);
                setEntryIsFading(true);
                requestSpacePointerLock();
              }}
              className="space-enterButton"
            >
              {t("space.enter")}
            </button>
          </div>
        </div>
      )}
      {canRender3d ? (
        <WebGPUErrorBoundary>
          <div
            className={`space-canvasWrap${entered ? "" : " space-canvasWrap--entry"}${entryIsFading ? " space-canvasWrap--entryFading" : ""}${focused ? " space-canvasWrap--disabled" : ""}`}
          >
            <Canvas
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
                <directionalLight
                  position={GALLERY_TOON.fillLight.position}
                  intensity={GALLERY_TOON.fillLight.intensity}
                  color={GALLERY_TOON.fillLight.color}
                />
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
                <Physics gravity={[0, -9.81, 0]}>
                  <SpaceScene
                    exhibitTarget={exhibitTarget}
                    onTargetChange={setExhibitTarget}
                    controlsEnabled={controlsEnabled}
                    onFocusExhibit={handleFocusExhibit}
                    onEmptyClick={handleEmptyClick}
                    suppressNextClick={suppressNextExhibitClick}
                    onConsumeSuppressedClick={handleConsumeSuppressedClick}
                  />
                </Physics>
                <GalleryRenderPipeline />
              </Suspense>
            </Canvas>
          </div>
        </WebGPUErrorBoundary>
      ) : null}
    </div>
  );
}
