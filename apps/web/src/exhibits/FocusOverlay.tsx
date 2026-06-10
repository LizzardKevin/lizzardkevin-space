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
  type RefObject,
} from "react";
import type { ExhibitManifestItem } from "./manifest";
import type { ExhibitButtonAction } from "./manifest";
import { usePlayback } from "../media/usePlayback";
import { createWebGPURenderer } from "../rendering/createWebGPURenderer";
import { runExhibitButtonAction } from "./runExhibitButtonAction";
import { loadExhibitContent, type ExhibitContent } from "./exhibitContent";
import { formatExhibitLabel } from "./exhibitTarget";
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
  onUserInteract,
}: {
  enabled: boolean;
  frame: FocusFrameResult | null;
  onUserInteract: () => void;
}) {
  const target = frame?.orbitTarget ?? [0, FOCUS_FRAME.orbitTargetY, 0];

  return (
    <OrbitControls
      enabled={enabled}
      enableRotate={enabled}
      enableZoom={enabled}
      autoRotate={false}
      onStart={onUserInteract}
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
  orbitEnabled,
  onBlankDoubleClick,
}: {
  exhibit: ExhibitManifestItem;
  onButtonAction: (action: ExhibitButtonAction) => void;
  orbitEnabled: boolean;
  onBlankDoubleClick: () => void;
}) {
  return (
    <FocusSceneContent
      key={exhibit.exhibitId}
      exhibit={exhibit}
      onButtonAction={onButtonAction}
      orbitEnabled={orbitEnabled}
      onBlankDoubleClick={onBlankDoubleClick}
    />
  );
}

function FocusSceneContent({
  exhibit,
  onButtonAction,
  orbitEnabled,
  onBlankDoubleClick,
}: {
  exhibit: ExhibitManifestItem;
  onButtonAction: (action: ExhibitButtonAction) => void;
  orbitEnabled: boolean;
  onBlankDoubleClick: () => void;
}) {
  const hitRootRef = useRef<THREE.Group>(null);
  const [turntableSpin, setTurntableSpin] = useState(true);
  const [frame, setFrame] = useState<FocusFrameResult | null>(null);

  return (
    <>
      <group ref={hitRootRef} position={[0, -0.6, 0]}>
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
        onUserInteract={() => setTurntableSpin(false)}
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
  const closingRef = useRef(false);
  const displayTitle = formatExhibitLabel(exhibit.exhibitId);
  const videoUrl = exhibit.media?.videoUrl;

  useEffect(() => {
    useGLTF.preload(exhibit.focusGlbUrl, GLTF_DRACO_DECODER_PATH);
  }, [exhibit.focusGlbUrl]);

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

  const handleBlankDoubleClick = useCallback(() => {
    if (!contentVisible || closingRef.current) return;
    requestClose();
  }, [contentVisible, requestClose]);

  const handleBlankClick = useFocusDoubleClickHandler(handleBlankDoubleClick);

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
      aria-describedby="focus-exit-hint"
      className={`focus-overlay${dimOn ? " focus-overlay--dim" : ""}${blurOn ? " focus-overlay--blur" : ""}`}
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

      <div className="focus-layout">
        <FocusSideColumn side="left" onBlankClick={handleBlankClick}>
          <FocusOverviewPanel
            overview={content?.overview ?? null}
            loading={contentLoading}
            visible={contentVisible}
          />
        </FocusSideColumn>

        <div className="focus-layout__center">
          <FocusExhibitTitle title={displayTitle} visible={contentVisible} />

          <FocusBlank
            className={`focus-blank--fill${SHOW_FOCUS_BLANK_DEBUG ? " focus-blank--debug-center" : ""}`}
            onBlankClick={handleBlankClick}
          />

          <p
            id="focus-exit-hint"
            className={`ui-hint-micro focus-exit-hint${contentVisible ? " focus-exit-hint--visible" : ""}`}
          >
            双击空白区域以退出
          </p>

          <FocusModelErrorBoundary url={exhibit.focusGlbUrl}>
            <Suspense fallback={<FocusLoading />}>
              <Canvas
                id="focus-canvas"
                data-cursor="drag-model"
                className={`focus-canvas${contentVisible ? " focus-canvas--visible" : ""}`}
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
                  orbitEnabled={contentVisible}
                  onBlankDoubleClick={handleBlankDoubleClick}
                />
              </Canvas>
            </Suspense>
          </FocusModelErrorBoundary>
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
