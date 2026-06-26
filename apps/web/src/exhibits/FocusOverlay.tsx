import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
  type RefObject,
  type CSSProperties,
} from "react";
import type { ExhibitManifestItem } from "./manifest";
import type { ExhibitButtonAction } from "./manifest";
import { usePlayback } from "../media/usePlayback";
import { createWebGPURenderer } from "../rendering/createWebGPURenderer";
import { runExhibitButtonAction } from "./runExhibitButtonAction";
import { loadExhibitContent, type ExhibitContent } from "./exhibitContent";
import { FOCUS_FRAME, FOCUS_TURNTABLE_RAD_PER_SEC, SHOW_FOCUS_BLANK_DEBUG } from "./focusConfig";
import {
  bindFocusButtonActions,
  fitFocusModelToFrame,
  type FocusFrameResult,
} from "./focusModelFrame";
import { GLTF_DRACO_DECODER_PATH } from "../scenes/gallery/galleryConfig";
import { FocusOverviewPanel, FocusSideColumn, FocusStoryPanel } from "./FocusContentPanels";
import { FocusExhibitTitle } from "./FocusExhibitTitle";
import { FocusDoubleClickExit } from "./FocusCanvasInput";
import { useFocusDoubleClickHandler } from "./focusDoubleClick";
import {
  getFocusMediaItems,
  nextFocusMediaIndex,
  resolveFocusMediaDragStep,
} from "./focusMedia.ts";
import { resolveFocusDisplayTitle } from "./focusDisplayTitle";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";

function FocusBlank({
  className,
  onBlankClick,
}: {
  className: string;
  onBlankClick: () => void;
}) {
  return (
    <div
      className={className}
      data-focus-blank="true"
      onClick={onBlankClick}
      aria-hidden
    />
  );
}

/** 世界空间固定灯光，不随相机/展品旋转。 */
function FocusLighting() {
  return (
    <>
      <ambientLight intensity={0.32} />
      <directionalLight position={[5, 9, 6]} intensity={1.35} color="#fff8f0" />
      <directionalLight position={[-5, 2.5, -4]} intensity={0.3} color="#c8d8f0" />
    </>
  );
}

/** 展台自转：只转展品，相机与灯光固定。 */
function FocusTurntable({
  active,
  target,
}: {
  active: boolean;
  target: RefObject<THREE.Group | null>;
}) {
  useFrame((_, delta) => {
    if (!active) return;
    const root = target.current;
    // eslint-disable-next-line react-hooks/immutability -- Three.js Object3D transforms are mutable runtime state.
    if (root) root.rotation.y += delta * FOCUS_TURNTABLE_RAD_PER_SEC;
  });
  return null;
}

function FocusCameraRig({ frame }: { frame: FocusFrameResult | null }) {
  const { camera } = useThree();

  useEffect(() => {
    if (!frame) return;
    camera.position.set(...frame.cameraPosition);
    camera.lookAt(frame.orbitTarget[0], frame.orbitTarget[1], frame.orbitTarget[2]);
    if ("fov" in camera && typeof camera.fov === "number") {
      // eslint-disable-next-line react-hooks/immutability -- R3F camera is an imperative Three.js object.
      camera.fov = FOCUS_FRAME.cameraFov;
      camera.updateProjectionMatrix();
    }
  }, [camera, frame]);

  return null;
}

function FocusOrbitControls({
  enabled,
  frame,
  onOrbitInteract,
}: {
  enabled: boolean;
  frame: FocusFrameResult | null;
  onOrbitInteract: () => void;
}) {
  const target = frame?.orbitTarget ?? [0, FOCUS_FRAME.orbitTargetY, 0];

  return (
    <OrbitControls
      enabled={enabled}
      enableRotate={enabled}
      enableZoom={enabled}
      autoRotate={false}
      onStart={onOrbitInteract}
      enablePan={false}
      enableDamping
      dampingFactor={0.12}
      makeDefault
      target={target}
      minDistance={frame?.minDistance ?? FOCUS_FRAME.minCameraDistance * FOCUS_FRAME.minZoomFactor}
      maxDistance={frame?.maxDistance ?? FOCUS_FRAME.minCameraDistance * FOCUS_FRAME.maxZoomFactor}
    />
  );
}

function FocusModel({
  url,
  buttons,
  onButtonAction,
  onFrameComputed,
}: {
  url: string;
  buttons: ExhibitManifestItem["buttons"] | undefined;
  onButtonAction: (action: ExhibitButtonAction) => void;
  onFrameComputed: (frame: FocusFrameResult) => void;
}) {
  const gltf = useGLTF(url, GLTF_DRACO_DECODER_PATH);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    const frame = fitFocusModelToFrame(scene);
    onFrameComputed(frame);
  }, [scene, onFrameComputed]);

  useEffect(() => {
    bindFocusButtonActions(scene, buttons);
  }, [buttons, scene]);

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      let obj: THREE.Object3D | null = e.object;
      while (obj) {
        const action = obj.userData?.focusButtonAction as ExhibitButtonAction | undefined;
        if (action) {
          e.stopPropagation();
          onButtonAction(action);
          return;
        }
        obj = obj.parent;
      }
    },
    [onButtonAction],
  );

  return (
    <group onPointerDown={handlePointerDown}>
      <primitive object={scene} />
    </group>
  );
}

function FocusScene({
  exhibit,
  onButtonAction,
  onOrbitInteract,
  orbitEnabled,
  onBlankDoubleClick,
}: {
  exhibit: ExhibitManifestItem;
  onButtonAction: (action: ExhibitButtonAction) => void;
  onOrbitInteract: () => void;
  orbitEnabled: boolean;
  onBlankDoubleClick: () => void;
}) {
  return (
    <FocusSceneContent
      key={exhibit.exhibitId}
      exhibit={exhibit}
      onButtonAction={onButtonAction}
      onOrbitInteract={onOrbitInteract}
      orbitEnabled={orbitEnabled}
      onBlankDoubleClick={onBlankDoubleClick}
    />
  );
}

function FocusSceneContent({
  exhibit,
  onButtonAction,
  onOrbitInteract,
  orbitEnabled,
  onBlankDoubleClick,
}: {
  exhibit: ExhibitManifestItem;
  onButtonAction: (action: ExhibitButtonAction) => void;
  onOrbitInteract: () => void;
  orbitEnabled: boolean;
  onBlankDoubleClick: () => void;
}) {
  const hitRootRef = useRef<THREE.Group>(null);
  const [turntableSpin, setTurntableSpin] = useState(true);
  const [frame, setFrame] = useState<FocusFrameResult | null>(null);
  const handleOrbitInteract = useCallback(() => {
    setTurntableSpin(false);
    onOrbitInteract();
  }, [onOrbitInteract]);

  return (
    <>
      <group ref={hitRootRef}>
        <FocusModel
          key={exhibit.focusGlbUrl}
          url={exhibit.focusGlbUrl}
          buttons={exhibit.buttons}
          onButtonAction={onButtonAction}
          onFrameComputed={setFrame}
        />
      </group>
      <FocusLighting />
      <FocusCameraRig frame={frame} />
      <FocusTurntable active={orbitEnabled && turntableSpin} target={hitRootRef} />
      <FocusOrbitControls
        enabled={orbitEnabled}
        frame={frame}
        onOrbitInteract={handleOrbitInteract}
      />
      <FocusDoubleClickExit
        hitRoot={hitRootRef}
        enabled={orbitEnabled}
        onBlankDoubleClick={onBlankDoubleClick}
      />
    </>
  );
}

function FocusLoading() {
  return (
    <div className="focus-loading" aria-hidden>
      加载展品…
    </div>
  );
}

function getFocusTags(exhibit: ExhibitManifestItem) {
  const tags = [exhibit.type.toUpperCase()];
  if (exhibit.media?.audioUrl) tags.push("AUDIO");
  if (exhibit.media?.videoUrl) tags.push("VIDEO");
  if (exhibit.buttons) tags.push("INTERACTIVE");
  tags.push("FOCUS");
  return Array.from(new Set(tags));
}

type FocusImageFrameSize = {
  normalWidth: number;
  normalHeight: number;
  expandedWidth: number;
  expandedHeight: number;
};

type ErrorBoundaryProps = { children: ReactNode; url: string };
type ErrorBoundaryState = { error: Error | null };

class FocusModelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="focus-error">
          Focus 模型加载失败
          <br />
          <span>{this.props.url}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

export function FocusOverlay({
  exhibit,
  onBeginDismiss,
  onClose,
}: {
  exhibit: ExhibitManifestItem;
  /** 退出时同步恢复 SPACE 控制；fromEscape 时延后到 keyup 再锁定鼠标。 */
  onBeginDismiss: (opts?: { fromEscape?: boolean }) => void;
  onClose: () => void;
}) {
  const playback = usePlayback();
  const [blurOn, setBlurOn] = useState(false);
  const [dimOn, setDimOn] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [content, setContent] = useState<ExhibitContent | null>(null);
  const [contentLoading, setContentLoading] = useState(true);
  const [orbitHintState, setOrbitHintState] = useState<{
    exhibitId: string;
    interacted: boolean;
  } | null>(null);
  const closingRef = useRef(false);
  const displayTitle = resolveFocusDisplayTitle(content, exhibit.exhibitId);
  const videoUrl = exhibit.media?.videoUrl;
  const mediaItems = useMemo(() => getFocusMediaItems(exhibit), [exhibit]);
  const [activeMediaState, setActiveMediaState] = useState({
    exhibitId: exhibit.exhibitId,
    index: 0,
  });
  const [mediaTransitionDirection, setMediaTransitionDirection] = useState<1 | -1>(1);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [imageHovering, setImageHovering] = useState(false);
  const [imageFrameSize, setImageFrameSize] = useState<FocusImageFrameSize | null>(null);
  const imageDragStartRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const activeImageRef = useRef<HTMLImageElement | null>(null);
  const preloadedFocusImagesRef = useRef<HTMLImageElement[]>([]);
  const activeMediaIndex =
    activeMediaState.exhibitId === exhibit.exhibitId
      ? Math.min(activeMediaState.index, mediaItems.length - 1)
      : 0;
  const activeMedia = mediaItems[activeMediaIndex] ?? mediaItems[0];
  const imageFrameReady = activeMedia.kind !== "image" || imageFrameSize !== null;
  const fallbackFocusTags = useMemo(() => getFocusTags(exhibit), [exhibit]);
  const focusTags = content?.tags ?? fallbackFocusTags;
  const hasOrbitInteracted =
    orbitHintState?.exhibitId === exhibit.exhibitId ? orbitHintState.interacted : false;

  useEffect(() => {
    useGLTF.preload(exhibit.focusGlbUrl, GLTF_DRACO_DECODER_PATH);
  }, [exhibit.focusGlbUrl]);

  useEffect(() => {
    const preloadImages = mediaItems.flatMap((item) => {
      if (item.kind !== "image") return [];
      const image = new Image();
      image.decoding = "async";
      image.loading = "eager";
      image.src = item.url;
      return image;
    });
    preloadedFocusImagesRef.current = preloadImages;
    return () => {
      preloadedFocusImagesRef.current = [];
    };
  }, [mediaItems]);

  useEffect(() => {
    let cancelled = false;
    loadExhibitContent(exhibit.exhibitId).then((c) => {
      if (!cancelled) {
        setContent(c);
        setContentLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [exhibit.exhibitId]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setBlurOn(true);
      setDimOn(true);
    });
    const showTimer = window.setTimeout(() => setContentVisible(true), 300);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(showTimer);
    };
  }, []);

  useEffect(() => {
    return () => {
      playback.stop();
      playback.attachVideoElement(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup on unmount only
  }, []);

  const onButtonAction = useCallback(
    (action: ExhibitButtonAction) => {
      runExhibitButtonAction(action, playback, exhibit.media, exhibit.type);
    },
    [playback, exhibit.media, exhibit.type],
  );

  const requestClose = useCallback(
    (opts?: { fromEscape?: boolean }) => {
      if (closingRef.current) return;
      closingRef.current = true;
      onBeginDismiss(opts);
      playback.stop();
      setContentVisible(false);
      window.setTimeout(() => {
        setBlurOn(false);
        setDimOn(false);
      }, 150);
      window.setTimeout(() => onClose(), 450);
    },
    [onBeginDismiss, onClose, playback],
  );

  const handleOrbitInteract = useCallback(() => {
    setOrbitHintState({ exhibitId: exhibit.exhibitId, interacted: true });
  }, [exhibit.exhibitId]);

  const handleBlankDoubleClick = useCallback(() => {
    if (!contentVisible || closingRef.current) return;
    requestClose();
  }, [contentVisible, requestClose]);

  const handleBlankClick = useFocusDoubleClickHandler(handleBlankDoubleClick);
  const handleMediaStep = useCallback(
    (direction: -1 | 1) => {
      setImageExpanded(false);
      setImageHovering(false);
      setImageFrameSize(null);
      imageDragStartRef.current = null;
      setMediaTransitionDirection(direction);
      setActiveMediaState((current) => {
        const currentIndex = current.exhibitId === exhibit.exhibitId ? current.index : 0;
        return {
          exhibitId: exhibit.exhibitId,
          index: nextFocusMediaIndex(currentIndex, direction, mediaItems.length),
        };
      });
    },
    [exhibit.exhibitId, mediaItems.length],
  );

  const handleMediaSelect = useCallback(
    (index: number) => {
      setImageExpanded(false);
      setImageHovering(false);
      setImageFrameSize(null);
      imageDragStartRef.current = null;
      const currentIndex =
        activeMediaState.exhibitId === exhibit.exhibitId ? activeMediaState.index : 0;
      if (index !== currentIndex) {
        setMediaTransitionDirection(index > currentIndex ? 1 : -1);
      }
      setActiveMediaState({ exhibitId: exhibit.exhibitId, index });
    },
    [activeMediaState.exhibitId, activeMediaState.index, exhibit.exhibitId],
  );

  const measureImageFrame = useCallback((image: HTMLImageElement) => {
    if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return;
    const stage = image.closest(".focus-layout__center") as HTMLElement | null;
    const overlayEl = image.closest(".focus-overlay") as HTMLElement | null;
    const stageRect = stage?.getBoundingClientRect();
    if (!stageRect) return;

    const overlayStyle = overlayEl ? window.getComputedStyle(overlayEl) : null;
    const topSafe = Number.parseFloat(overlayStyle?.getPropertyValue("--focus-top-safe") ?? "") || 92;
    const bottomSafe = Number.parseFloat(overlayStyle?.getPropertyValue("--focus-bottom-safe") ?? "") || 118;
    const maxWidth = Math.min(1040, window.innerWidth * 0.74);
    const maxHeight = Math.max(120, stageRect.height - topSafe - bottomSafe);
    const aspect = image.naturalWidth / image.naturalHeight;
    let normalWidth = maxWidth;
    let normalHeight = normalWidth / aspect;

    if (normalHeight > maxHeight) {
      normalHeight = maxHeight;
      normalWidth = normalHeight * aspect;
    }

    const targetExpandedArea = window.innerWidth * window.innerHeight * 0.6;
    const maxExpandedWidth = window.innerWidth * 0.9;
    const maxExpandedHeight = window.innerHeight * 0.86;
    let expandedWidth = Math.sqrt(targetExpandedArea * aspect);
    let expandedHeight = expandedWidth / aspect;

    if (expandedWidth > maxExpandedWidth) {
      expandedWidth = maxExpandedWidth;
      expandedHeight = expandedWidth / aspect;
    }

    if (expandedHeight > maxExpandedHeight) {
      expandedHeight = maxExpandedHeight;
      expandedWidth = expandedHeight * aspect;
    }

    setImageFrameSize({
      normalWidth: Math.round(normalWidth),
      normalHeight: Math.round(normalHeight),
      expandedWidth: Math.round(expandedWidth),
      expandedHeight: Math.round(expandedHeight),
    });
  }, []);

  useEffect(() => {
    const image = activeImageRef.current;
    if (!image || activeMedia.kind !== "image") return;
    measureImageFrame(image);

    const onResize = () => measureImageFrame(image);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeMedia.kind, activeMedia.url, measureImageFrame]);

  const updateImagePointerMotion = useCallback((target: HTMLDivElement, x: number, y: number) => {
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const originX = ((x - rect.left) / rect.width) * 100;
    const originY = ((y - rect.top) / rect.height) * 100;

    target.style.setProperty("--focus-image-origin-x", `${originX.toFixed(2)}%`);
    target.style.setProperty("--focus-image-origin-y", `${originY.toFixed(2)}%`);
  }, []);

  const resetImagePointerMotion = useCallback((target: HTMLDivElement) => {
    target.style.setProperty("--focus-image-origin-x", "50%");
    target.style.setProperty("--focus-image-origin-y", "50%");
  }, []);

  const handleImagePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (activeMedia.kind !== "image" || imageExpanded) return;
      updateImagePointerMotion(e.currentTarget, e.clientX, e.clientY);
      imageDragStartRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [activeMedia.kind, imageExpanded, updateImagePointerMotion],
  );

  const handleImagePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (activeMedia.kind !== "image" || imageExpanded) return;
      updateImagePointerMotion(e.currentTarget, e.clientX, e.clientY);
    },
    [activeMedia.kind, imageExpanded, updateImagePointerMotion],
  );

  const handleImagePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (imageExpanded) {
        setImageExpanded(false);
        return;
      }
      const start = imageDragStartRef.current;
      if (!start || start.pointerId !== e.pointerId) return;
      imageDragStartRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      const step = resolveFocusMediaDragStep(
        activeMedia.kind,
        e.clientX - start.x,
        e.clientY - start.y,
      );
      if (step === 0) {
        e.preventDefault();
        e.stopPropagation();
        resetImagePointerMotion(e.currentTarget);
        setImageHovering(false);
        setImageExpanded(true);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      handleMediaStep(step);
    },
    [activeMedia.kind, handleMediaStep, imageExpanded, resetImagePointerMotion],
  );

  const handleImagePointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (imageDragStartRef.current?.pointerId !== e.pointerId) return;
      imageDragStartRef.current = null;
      resetImagePointerMotion(e.currentTarget);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [resetImagePointerMotion],
  );

  const handleImagePointerLeave = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      setImageHovering(false);
      resetImagePointerMotion(e.currentTarget);
    },
    [resetImagePointerMotion],
  );

  const handleImagePointerEnter = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (activeMedia.kind !== "image" || imageExpanded) return;
      setImageHovering(true);
      updateImagePointerMotion(e.currentTarget, e.clientX, e.clientY);
    },
    [activeMedia.kind, imageExpanded, updateImagePointerMotion],
  );

  const handleImageLoad = useCallback(
    (e: SyntheticEvent<HTMLImageElement>) => {
      activeImageRef.current = e.currentTarget;
      measureImageFrame(e.currentTarget);
    },
    [measureImageFrame],
  );

  const imageFrameStyle = useMemo(() => {
    const style: Record<string, string> = {
      "--focus-image-origin-x": "50%",
      "--focus-image-origin-y": "50%",
    };
    if (imageFrameSize) {
      style["--focus-image-rendered-width"] = `${imageFrameSize.normalWidth}px`;
      style["--focus-image-rendered-height"] = `${imageFrameSize.normalHeight}px`;
      style["--focus-image-expanded-width"] = `${imageFrameSize.expandedWidth}px`;
      style["--focus-image-expanded-height"] = `${imageFrameSize.expandedHeight}px`;
    }
    return style as CSSProperties;
  }, [imageFrameSize]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose({ fromEscape: true });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`focus-overlay${dimOn ? " focus-overlay--dim" : ""}${blurOn ? " focus-overlay--blur" : ""}`}
      data-cursor-tone="light"
    >
      {videoUrl ? (
        <video
          ref={(el) => playback.attachVideoElement(el)}
          className={`focus-video${exhibit.type === "video" ? " focus-video--visible" : ""}`}
          playsInline
          preload="metadata"
          src={videoUrl}
        />
      ) : null}

      {imageExpanded ? (
        <button
          type="button"
          className="focus-image-lightbox"
          aria-label="Close enlarged image"
          data-cursor="interactive"
          data-cursor-tone="light"
          onClick={() => setImageExpanded(false)}
        />
      ) : null}

      <button
        type="button"
        className={`focus-return-button${contentVisible ? " focus-return-button--visible" : ""}`}
        data-cursor="interactive"
        data-cursor-tone="light"
        onClick={() => requestClose()}
      >
        <span className="focus-return-button__prefix">回到</span>
        <span className="focus-return-button__space">space</span>
      </button>

      <div className="focus-layout">
        <FocusSideColumn side="left" onBlankClick={handleBlankClick}>
          <FocusOverviewPanel
            overview={content?.overview ?? null}
            loading={contentLoading}
            tags={focusTags}
            metadata={content?.metadata}
            visible={contentVisible}
          />
        </FocusSideColumn>

        <div className="focus-layout__center">
          <FocusExhibitTitle
            title={displayTitle}
            subtitle={content?.subtitle}
            visible={contentVisible}
          />

          <FocusBlank
            className={`focus-blank--fill${SHOW_FOCUS_BLANK_DEBUG ? " focus-blank--debug-center" : ""}`}
            onBlankClick={handleBlankClick}
          />

          <FocusModelErrorBoundary url={exhibit.focusGlbUrl}>
            <Suspense fallback={<FocusLoading />}>
              <Canvas
                id="focus-canvas"
                data-cursor="drag-model"
                className={`focus-canvas${contentVisible && activeMedia.kind === "model" ? " focus-canvas--visible" : ""}`}
                gl={(props) =>
                  createWebGPURenderer({
                    canvas: props.canvas as HTMLCanvasElement,
                    antialias: props.antialias,
                    alpha: true,
                  })
                }
                camera={{
                fov: FOCUS_FRAME.cameraFov,
                near: 0.01,
                far: 200,
                position: [0, FOCUS_FRAME.orbitTargetY + FOCUS_FRAME.cameraHeightOffset, 3.6],
              }}
                onCreated={({ gl }) => {
                  gl.domElement.id = "focus-canvas";
                }}
              >
                <FocusScene
                  exhibit={exhibit}
                  onButtonAction={onButtonAction}
                  onOrbitInteract={handleOrbitInteract}
                  orbitEnabled={contentVisible && activeMedia.kind === "model"}
                  onBlankDoubleClick={handleBlankDoubleClick}
                />
              </Canvas>
            </Suspense>
          </FocusModelErrorBoundary>

          {activeMedia.kind === "image" ? (
            <div
              key={activeMedia.url}
              className={`focus-image-frame${contentVisible && imageFrameReady ? " focus-image-frame--visible" : ""}${imageHovering ? " focus-image-frame--hovered" : ""}${imageExpanded ? " focus-image-frame--expanded" : ` focus-image-frame--step-${mediaTransitionDirection === 1 ? "next" : "previous"}`}`}
              style={imageFrameStyle}
              data-cursor="interactive"
              role="button"
              tabIndex={0}
              aria-label={`Open ${displayTitle} image`}
              onPointerDown={handleImagePointerDown}
              onPointerEnter={handleImagePointerEnter}
              onPointerMove={handleImagePointerMove}
              onPointerUp={handleImagePointerUp}
              onPointerCancel={handleImagePointerCancel}
              onPointerLeave={handleImagePointerLeave}
            >
              <img
                ref={activeImageRef}
                className="focus-image"
                src={activeMedia.url}
                alt={displayTitle}
                loading="eager"
                decoding="async"
                draggable={false}
                onLoad={handleImageLoad}
              />
            </div>
          ) : null}

          {mediaItems.length > 1 && !imageExpanded ? (
            <>
              <button
                type="button"
                className="focus-media-arrow focus-media-arrow--left"
                aria-label="Previous exhibit image"
                data-cursor="interactive"
                data-cursor-tone="light"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMediaStep(-1);
                }}
              />
              <button
                type="button"
                className="focus-media-arrow focus-media-arrow--right"
                aria-label="Next exhibit image"
                data-cursor="interactive"
                data-cursor-tone="light"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMediaStep(1);
                }}
              />
            </>
          ) : null}

          {mediaItems.length > 1 && !imageExpanded ? (
            <div className="focus-media-dots" aria-label="Focus media pages">
              {mediaItems.map((item, index) => (
                <button
                  key={`${item.kind}-${item.url}`}
                  type="button"
                  className={`focus-media-dot${index === activeMediaIndex ? " focus-media-dot--active" : ""}${item.kind === "model" ? " focus-media-dot--model" : ""}`}
                  aria-label={item.kind === "model" ? "Show 3D model" : `Show image ${index}`}
                  aria-current={index === activeMediaIndex ? "true" : undefined}
                  data-cursor="interactive"
                  data-cursor-tone="light"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMediaSelect(index);
                  }}
                />
              ))}
            </div>
          ) : null}

          <p
            className={`ui-hint-micro focus-orbit-hint${contentVisible && activeMedia.kind === "model" && !hasOrbitInteracted ? " focus-orbit-hint--visible" : ""}`}
          >
            drag to orbit
          </p>
        </div>

        <FocusSideColumn side="right" onBlankClick={handleBlankClick}>
          <FocusStoryPanel
            storyHtml={content?.storyHtml ?? null}
            loading={contentLoading}
            visible={contentVisible}
          />
        </FocusSideColumn>
      </div>
    </div>
  );
}
