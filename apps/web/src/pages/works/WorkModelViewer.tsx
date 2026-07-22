import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { GLTF_DRACO_DECODER_PATH } from "../../scenes/gallery/galleryConfig";
import { applyTreeHabitatSharedMaterials } from "../../scenes/exhibits/exhibitMaterialOverrides";

/**
 * 作品详情页内嵌 3D 查看器：只依赖 focusGlbUrl + 公共 draco 解码路径，
 * 不含任何展品特定参数。包围盒逐轴自动取景（宽扁填满画宽、瘦高填满画高），
 * 任何未来展品零配置适配。自转由 OrbitControls autoRotate 驱动，
 * 相机状态单一归属 controls，避免多源写相机互相打架。
 */

type StageFrame = {
  cameraPosition: [number, number, number];
  orbitTarget: [number, number, number];
  minDistance: number;
  maxDistance: number;
};

const STAGE_FRAME = {
  targetDiameter: 2.2,
  minScale: 0.02,
  maxScale: 20,
  cameraFov: 45,
  framePadding: 1.25,
  maxZoomFactor: 3.2,
  autoRotateSpeed: 0.8,
} as const;

function computeStageFrame(root: THREE.Object3D, aspect: number): StageFrame {
  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);

  const fallback: StageFrame = {
    cameraPosition: [0, 0.2, 3.6],
    orbitTarget: [0, 0, 0],
    minDistance: 0.8,
    maxDistance: 10,
  };

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.lengthSq() < 1e-10) return fallback;

  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const diameter = Math.max(sphere.radius * 2, 1e-4);
  const scale = THREE.MathUtils.clamp(
    STAGE_FRAME.targetDiameter / diameter,
    STAGE_FRAME.minScale,
    STAGE_FRAME.maxScale,
  );
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);

  const anchor = new THREE.Vector3();
  new THREE.Box3().setFromObject(root).getCenter(anchor);
  root.position.sub(anchor);
  root.updateMatrixWorld(true);

  const fitted = new THREE.Box3().setFromObject(root);
  const fittedSize = fitted.getSize(new THREE.Vector3());
  const radius = Math.max(
    fitted.getBoundingSphere(new THREE.Sphere()).radius,
    1e-3,
  );

  const safeAspect = Number.isFinite(aspect) && aspect > 0.2 ? aspect : 16 / 9;
  const vFov = THREE.MathUtils.degToRad(STAGE_FRAME.cameraFov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * safeAspect);
  const halfY = (fittedSize.y / 2) * STAGE_FRAME.framePadding;
  const halfX = (Math.max(fittedSize.x, fittedSize.z) / 2) * STAGE_FRAME.framePadding;
  const distance = Math.max(
    halfY / Math.tan(vFov / 2),
    halfX / Math.tan(hFov / 2),
    radius * 0.6,
  );

  return {
    cameraPosition: [0, distance * 0.18, distance],
    orbitTarget: [0, 0, 0],
    minDistance: Math.min(radius * 1.05, distance * 0.8),
    maxDistance: distance * STAGE_FRAME.maxZoomFactor,
  };
}

function StageLighting() {
  return (
    <>
      <ambientLight intensity={0.34} />
      <directionalLight position={[5, 9, 6]} intensity={1.35} color="#fff8f0" />
      <directionalLight position={[-5, 2.5, -4]} intensity={0.3} color="#c8d8f0" />
    </>
  );
}

function StageModel({
  exhibitId,
  url,
  onFrame,
}: {
  exhibitId: string;
  url: string;
  onFrame: (frame: StageFrame) => void;
}) {
  const gltf = useGLTF(url, GLTF_DRACO_DECODER_PATH);
  const { size } = useThree();
  const scene = useMemo(() => {
    const object = gltf.scene.clone(true);
    applyTreeHabitatSharedMaterials(object, exhibitId);
    return object;
  }, [exhibitId, gltf.scene]);

  useEffect(() => {
    onFrame(computeStageFrame(scene, size.width / Math.max(size.height, 1)));
  }, [scene, size.width, size.height, onFrame]);

  return <primitive object={scene} />;
}

/** 取景结果同步进相机与 OrbitControls（controls 是相机状态的唯一归属）。 */
function StageCameraSync({ frame }: { frame: StageFrame | null }) {
  const { camera, controls } = useThree();

  useEffect(() => {
    if (!frame) return;
    camera.position.set(...frame.cameraPosition);
    const orbitControls = controls as OrbitControlsImpl | null;
    if (orbitControls) {
      orbitControls.target.set(...frame.orbitTarget);
      orbitControls.update();
    } else {
      camera.lookAt(...frame.orbitTarget);
    }
    if ("fov" in camera && typeof camera.fov === "number") {
      // eslint-disable-next-line react-hooks/immutability -- R3F camera 是命令式 Three 对象。
      camera.fov = STAGE_FRAME.cameraFov;
      camera.updateProjectionMatrix();
    }
  }, [camera, controls, frame]);

  return null;
}

/** r3f Canvas 内部的错误边界：模型加载失败时通知父级降级为静态图。 */
class StageErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function WorkModelViewer({
  exhibitId,
  url,
  onReady,
  onError,
}: {
  exhibitId: string;
  url: string;
  onReady: () => void;
  onError: () => void;
}) {
  const [frame, setFrame] = useState<StageFrame | null>(null);
  const [spinning, setSpinning] = useState(true);

  const handleFrame = useCallback(
    (next: StageFrame) => {
      setFrame(next);
      onReady();
    },
    [onReady],
  );

  return (
    <Canvas
      className="ark-wstage__canvas"
      dpr={[1, 2]}
      camera={{ fov: STAGE_FRAME.cameraFov, position: [0, 0.5, 3.6] }}
      gl={{ antialias: true, alpha: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      <StageErrorBoundary onError={onError}>
        <Suspense fallback={null}>
          <StageModel key={url} exhibitId={exhibitId} url={url} onFrame={handleFrame} />
          <StageLighting />
          <StageCameraSync frame={frame} />
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.12}
            enablePan={false}
            autoRotate={spinning}
            autoRotateSpeed={STAGE_FRAME.autoRotateSpeed}
            onStart={() => setSpinning(false)}
            target={[0, 0, 0]}
            minDistance={frame?.minDistance ?? 0.8}
            maxDistance={frame?.maxDistance ?? 12}
          />
        </Suspense>
      </StageErrorBoundary>
    </Canvas>
  );
}
