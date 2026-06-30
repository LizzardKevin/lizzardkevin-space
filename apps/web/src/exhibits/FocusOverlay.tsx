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
  type FocusMediaItem,
  nextFocusMediaIndex,
  resolveFocusMediaDragStep,
} from "./focusMedia.ts";
import {
  resolveFocusImageCardMotion,
  type FocusImageCardMotion,
} from "./focusImageCardMotion.ts";
import {
  resolveFocusImageFrameSize,
  resolveFocusSafeAreaPx,
  type FocusImageFrameSize,
} from "./focusImageFrameSize.ts";
import { preloadFocusImages, type PreloadedFocusImage } from "./focusImagePreload.ts";
import { resolveFocusDisplayTitle } from "./focusDisplayTitle";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";

type DepartingFocusImage = {
  direction: -1 | 1;
  id: number;
  style: CSSProperties;
  url: string;
};

function getFocusImageFrameStyle(imageFrameSize: FocusImageFrameSize | null) {
  const style: Record<string, string> = {
    "--focus-image-card-rotate-x": "0deg",
    "--focus-image-card-rotate-y": "0deg",
    "--focus-image-card-drift-x": "0px",
    "--focus-image-card-drift-y": "0px",
    "--focus-image-card-depth": "0px",
    "--focus-image-glass-angle": "0deg",
    "--focus-image-glass-opacity": "0",
  };
  if (imageFrameSize) {
    style["--focus-image-rendered-width"] = `${imageFrameSize.normalWidth}px`;
    style["--focus-image-rendered-height"] = `${imageFrameSize.normalHeight}px`;
    style["--focus-image-expanded-width"] = `${imageFrameSize.expandedWidth}px`;
    style["--focus-image-expanded-height"] = `${imageFrameSize.expandedHeight}px`;
  }
  return style as CSSProperties;
}

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

const defaultFocusImageCardMotion: FocusImageCardMotion = {
  rotateXDeg: 0,
  rotateYDeg: 0,
  translateXPx: 0,
  translateYPx: 0,
  translateZPx: 0,
  scale: 1,
  glassAngleDeg: 0,
  glassOpacity: 0,
};

function writeFocusImageCardMotion(target: HTMLDivElement, motion: FocusImageCardMotion) {
  target.style.setProperty("--focus-image-card-rotate-x", `${motion.rotateXDeg.toFixed(2)}deg`);
  target.style.setProperty("--focus-image-card-rotate-y", `${motion.rotateYDeg.toFixed(2)}deg`);
  target.style.setProperty("--focus-image-card-drift-x", `${motion.translateXPx.toFixed(2)}px`);
  target.style.setProperty("--focus-image-card-drift-y", `${motion.translateYPx.toFixed(2)}px`);
  target.style.setProperty("--focus-image-card-depth", `${motion.translateZPx.toFixed(2)}px`);
  target.style.setProperty("--focus-image-glass-angle", `${motion.glassAngleDeg.toFixed(2)}deg`);
  target.style.setProperty("--focus-image-glass-opacity", motion.glassOpacity.toFixed(2));
}

function resetFocusImageCardMotion(target: HTMLDivElement) {
  writeFocusImageCardMotion(target, defaultFocusImageCardMotion);
}

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
  const [imageMotionLive, setImageMotionLive] = useState(false);
  const [imageFrameSize, setImageFrameSize] = useState<FocusImageFrameSize | null>(null);
  const [departingImage, setDepartingImage] = useState<DepartingFocusImage | null>(null);
  const imageDragStartRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const activeImageRef = useRef<HTMLImageElement | null>(null);
  const imageFrameRef = useRef<HTMLDivElement | null>(null);
  const imageExpandedRef = useRef(false);
  const imageHoveringRef = useRef(false);
  const imageMotionLiveRef = useRef(false);
  const departingImageIdRef = useRef(0);
  const departingImageTimerRef = useRef<number | null>(null);
  const preloadedFocusImagesRef = useRef<PreloadedFocusImage[]>([]);
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
    const preloadImages = preloadFocusImages(mediaItems);
    preloadedFocusImagesRef.current = preloadImages;
    void Promise.allSettled(preloadImages.map((preload) => preload.ready));
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
      if (departingImageTimerRef.current !== null) {
        window.clearTimeout(departingImageTimerRef.current);
      }
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

  const setImageExpandedState = useCallback((expanded: boolean) => {
    imageExpandedRef.current = expanded;
    setImageExpanded(expanded);
  }, []);

  const beginImageDeparture = useCallback(
    (direction: -1 | 1, media: FocusMediaItem) => {
      if (media.kind !== "image") return;
      if (departingImageTimerRef.current !== null) {
        window.clearTimeout(departingImageTimerRef.current);
      }
      departingImageIdRef.current += 1;
      setDepartingImage({
        direction,
        id: departingImageIdRef.current,
        style: getFocusImageFrameStyle(imageFrameSize),
        url: media.url,
      });
      departingImageTimerRef.current = window.setTimeout(() => {
        setDepartingImage(null);
        departingImageTimerRef.current = null;
      }, 460);
    },
    [imageFrameSize],
  );

  const handleMediaStep = useCallback(
    (direction: -1 | 1) => {
      beginImageDeparture(direction, activeMedia);
      setImageExpandedState(false);
      setImageHovering(false);
      imageMotionLiveRef.current = false;
      setImageMotionLive(false);
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
    [activeMedia, beginImageDeparture, exhibit.exhibitId, mediaItems.length, setImageExpandedState],
  );

  const handleMediaSelect = useCallback(
    (index: number) => {
      setImageExpandedState(false);
      setImageHovering(false);
      imageMotionLiveRef.current = false;
      setImageMotionLive(false);
      setImageFrameSize(null);
      imageDragStartRef.current = null;
      const currentIndex =
        activeMediaState.exhibitId === exhibit.exhibitId ? activeMediaState.index : 0;
      if (index !== currentIndex) {
        const direction = index > currentIndex ? 1 : -1;
        beginImageDeparture(direction, activeMedia);
        setMediaTransitionDirection(direction);
      }
      setActiveMediaState({ exhibitId: exhibit.exhibitId, index });
    },
    [
      activeMedia,
      activeMediaState.exhibitId,
      activeMediaState.index,
      beginImageDeparture,
      exhibit.exhibitId,
      setImageExpandedState,
    ],
  );

  const measureImageFrame = useCallback((image: HTMLImageElement) => {
    if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return;
    const stage = image.closest(".focus-layout__center") as HTMLElement | null;
    const overlayEl = image.closest(".focus-overlay") as HTMLElement | null;
    const stageRect = stage?.getBoundingClientRect();
    if (!stageRect) return;

    const overlayStyle = overlayEl ? window.getComputedStyle(overlayEl) : null;
    const topSafe = resolveFocusSafeAreaPx(
      overlayStyle?.getPropertyValue("--focus-top-safe"),
      window.innerHeight,
      92,
    );
    const bottomSafe = resolveFocusSafeAreaPx(
      overlayStyle?.getPropertyValue("--focus-bottom-safe"),
      window.innerHeight,
      118,
    );
    setImageFrameSize(
      resolveFocusImageFrameSize({
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        stageWidth: stageRect.width,
        stageHeight: stageRect.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        topSafe,
        bottomSafe,
      }),
    );
  }, []);

  useEffect(() => {
    const image = activeImageRef.current;
    if (!image || activeMedia.kind !== "image") return;
    measureImageFrame(image);

    const onResize = () => measureImageFrame(image);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeMedia.kind, activeMedia.url, measureImageFrame]);

  const updateImagePointerMotion = useCallback((target: HTMLDivElement, x: number, y: number, hovering = imageHoveringRef.current) => {
    if (
      imageExpandedRef.current ||
      target.classList.contains("focus-image-frame--expanded")
    ) {
      resetFocusImageCardMotion(target);
      return;
    }
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduceMotion) {
      resetFocusImageCardMotion(target);
      return;
    }
    writeFocusImageCardMotion(
      target,
      resolveFocusImageCardMotion({
        frameLeft: rect.left,
        frameTop: rect.top,
        frameWidth: rect.width,
        frameHeight: rect.height,
        pointerX: x,
        pointerY: y,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        hovering,
      }),
    );
  }, []);

  const resetImagePointerMotion = useCallback((target: HTMLDivElement) => {
    resetFocusImageCardMotion(target);
  }, []);

  const enableImageMotionLive = useCallback((target: HTMLDivElement) => {
    imageMotionLiveRef.current = true;
    target.classList.add("focus-image-frame--live");
    setImageMotionLive(true);
  }, []);

  const disableImageMotionLive = useCallback((target?: HTMLDivElement | null) => {
    imageMotionLiveRef.current = false;
    target?.classList.remove("focus-image-frame--live");
    setImageMotionLive(false);
  }, []);

  useEffect(() => {
    if (activeMedia.kind !== "image" || imageExpanded) return;
    const handleWindowPointerMove = (e: PointerEvent) => {
      if (imageExpandedRef.current) return;
      const target = imageFrameRef.current;
      if (!target) return;
      updateImagePointerMotion(target, e.clientX, e.clientY, imageHoveringRef.current);
    };
    window.addEventListener("pointermove", handleWindowPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleWindowPointerMove);
  }, [activeMedia.kind, activeMedia.url, imageExpanded, updateImagePointerMotion]);

  useEffect(() => {
    imageHoveringRef.current = false;
    const target = imageFrameRef.current;
    imageMotionLiveRef.current = false;
    target?.classList.remove("focus-image-frame--live");
    if (target) resetFocusImageCardMotion(target);
  }, [activeMedia.kind, activeMedia.url, imageExpanded]);

  const handleImagePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (activeMedia.kind !== "image" || imageExpanded || imageExpandedRef.current) return;
      updateImagePointerMotion(e.currentTarget, e.clientX, e.clientY);
      imageDragStartRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [activeMedia.kind, imageExpanded, updateImagePointerMotion],
  );

  const handleImagePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (activeMedia.kind !== "image" || imageExpanded || imageExpandedRef.current) return;
      updateImagePointerMotion(e.currentTarget, e.clientX, e.clientY, true);
    },
    [activeMedia.kind, imageExpanded, updateImagePointerMotion],
  );

  const handleImagePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (imageExpanded) {
        setImageExpandedState(false);
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
        disableImageMotionLive(e.currentTarget);
        imageHoveringRef.current = false;
        setImageExpandedState(true);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      handleMediaStep(step);
    },
    [
      activeMedia.kind,
      disableImageMotionLive,
      handleMediaStep,
      imageExpanded,
      resetImagePointerMotion,
      setImageExpandedState,
    ],
  );

  const handleImagePointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (imageDragStartRef.current?.pointerId !== e.pointerId) return;
      imageDragStartRef.current = null;
      disableImageMotionLive(e.currentTarget);
      resetImagePointerMotion(e.currentTarget);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [disableImageMotionLive, resetImagePointerMotion],
  );

  const handleImagePointerLeave = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      imageHoveringRef.current = false;
      disableImageMotionLive(e.currentTarget);
      setImageHovering(false);
      updateImagePointerMotion(e.currentTarget, e.clientX, e.clientY, false);
    },
    [disableImageMotionLive, updateImagePointerMotion],
  );

  const handleImagePointerEnter = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (activeMedia.kind !== "image" || imageExpanded || imageExpandedRef.current) return;
      imageHoveringRef.current = true;
      enableImageMotionLive(e.currentTarget);
      setImageHovering(true);
      updateImagePointerMotion(e.currentTarget, e.clientX, e.clientY, true);
    },
    [activeMedia.kind, enableImageMotionLive, imageExpanded, updateImagePointerMotion],
  );

  const handleImageLoad = useCallback(
    (e: SyntheticEvent<HTMLImageElement>) => {
      activeImageRef.current = e.currentTarget;
      measureImageFrame(e.currentTarget);
    },
    [measureImageFrame],
  );

  const imageFrameStyle = useMemo(
    () => getFocusImageFrameStyle(imageFrameSize),
    [imageFrameSize],
  );
  const centerFrameStyle = useMemo(() => {
    const style: Record<string, string> = {};
    if (imageFrameSize) {
      style["--focus-media-half-width"] = `${Math.round(imageFrameSize.normalWidth / 2)}px`;
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
          onClick={() => setImageExpandedState(false)}
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
          <div className="focus-left-stack">
            <FocusExhibitTitle
              title={displayTitle}
              subtitle={content?.subtitle}
              visible={contentVisible}
            />
            <FocusOverviewPanel
              overview={content?.overview ?? null}
              loading={contentLoading}
              tags={focusTags}
              metadata={content?.metadata}
              visible={contentVisible}
            />
          </div>
        </FocusSideColumn>

        <div className="focus-layout__center" style={centerFrameStyle}>
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

          {departingImage ? (
            <div
              key={`departing-${departingImage.url}-${departingImage.id}`}
              className={`focus-image-frame focus-image-frame--visible focus-image-frame--departing focus-image-frame--depart-${departingImage.direction === 1 ? "left" : "right"}`}
              style={departingImage.style}
              aria-hidden
            >
              <div className="focus-image-surface">
                <img
                  className="focus-image"
                  src={departingImage.url}
                  alt=""
                  loading="eager"
                  decoding="async"
                  draggable={false}
                />
              </div>
            </div>
          ) : null}

          {activeMedia.kind === "image" ? (
            <div
              ref={imageFrameRef}
              key={activeMedia.url}
              className={`focus-image-frame${contentVisible && imageFrameReady ? " focus-image-frame--visible" : ""}${!imageExpanded && imageHovering ? " focus-image-frame--hovered" : ""}${!imageExpanded && imageMotionLive ? " focus-image-frame--live" : ""}${imageExpanded ? " focus-image-frame--expanded" : ` focus-image-frame--step-${mediaTransitionDirection === 1 ? "next" : "previous"}`}`}
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
              <div className="focus-image-surface">
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
