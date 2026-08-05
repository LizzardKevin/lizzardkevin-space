import {
  Component,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { WebGPURenderer } from "three/webgpu";
import { createWebGPURenderer } from "../../rendering/createWebGPURenderer";
import { GALLERY_GLB_URL, GLTF_DRACO_DECODER_PATH } from "../../scenes/gallery/galleryConfig";
import { getGalleryInkOutlineMaterial } from "../../scenes/gallery/galleryInkOutline";
import type { SpacePlayerPose } from "../spaceDailyResume";
import { readSpaceReducedMotionPreference } from "../spaceMotionPolicy";
import { SPACE_VISUAL_TOKENS } from "../spaceVisualTokens";
import {
  dampSpaceMinimapAngleRad,
  fitSpaceMinimapCamera,
  resolveSpaceMinimapElevationRad,
  SPACE_MINIMAP_AZIMUTH_LAMBDA,
  spaceMinimapAzimuthForYaw,
} from "./minimapCamera";
import { buildSpaceMinimapModel } from "./minimapModel";

/**
 * 右上角全息小地图:独立 canvas + 独立 WebGPU/WebGL2 渲染器(叠层先例:
 * work-focus overlay canvas),不进入主 Canvas 的 R3F/后处理管线。
 * 模型为纯白 basic 材质 + 分层透明度(楼板实、墙体虚,层层叠加出体积),
 * 正交相机 heading-up 跟随玩家 yaw、仰角轻微跟随 pitch,
 * 橙色信号点以 depthTest:false 穿透墙体标记玩家位置(旷野之息式 xray dot)。
 */

const SPACE_MINIMAP_FRAME_MS = 1000 / 30;
const SPACE_MINIMAP_MAX_DPR = 1.5;

/** 分层透明度:wall 最虚、floor 最实;配合纯白 basic 材质在深场景上读出体积。 */
const SPACE_MINIMAP_LAYER_OPACITY = {
  floor: 0.34,
  wall: 0.1,
  other: 0.18,
} as const;

/** 玩家点随建筑体量缩放,并轻微抬离脚部高度保证读感。 */
function resolveSpaceMinimapDotRadius(modelRadius: number) {
  return Math.min(Math.max(modelRadius * 0.03, 0.4), 1.6);
}

class SpaceMinimapErrorBoundary extends Component<
  { children: ReactNode; onFailed: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) console.warn("[SpaceMinimap] map disabled:", error);
    this.props.onFailed();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function SpaceMinimapCanvas({
  poseRef,
  active,
  onFailed,
}: {
  poseRef: RefObject<SpacePlayerPose | null>;
  active: boolean;
  onFailed: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gltf = useGLTF(GALLERY_GLB_URL, GLTF_DRACO_DECODER_PATH);
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const model = buildSpaceMinimapModel(gltf.scene);
    if (!model) {
      if (import.meta.env.DEV) console.warn("[SpaceMinimap] no architecture meshes collected");
      onFailed();
      return;
    }

    const scene = new THREE.Scene();
    scene.name = "space_minimap_scene";

    // 纯白 basic 全息:不受光照、不被色调映射压暗;分层透明度叠加出“层层叠叠”。
    const layerMaterials: THREE.MeshBasicMaterial[] = [];
    for (const layer of ["floor", "wall", "other"] as const) {
      const geometry = model.layers[layer];
      if (!geometry) continue;
      const material = new THREE.MeshBasicMaterial({
        name: `space_minimap_holo_${layer}`,
        color: SPACE_VISUAL_TOKENS.colors.paper,
        toneMapped: false,
        transparent: true,
        opacity: SPACE_MINIMAP_LAYER_OPACITY[layer],
        depthWrite: false,
      });
      layerMaterials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = 1;
      mesh.raycast = () => null;
      scene.add(mesh);
    }

    if (model.inkGeometry) {
      const inkMesh = new THREE.Mesh(model.inkGeometry, getGalleryInkOutlineMaterial());
      inkMesh.renderOrder = 2;
      inkMesh.raycast = () => null;
      scene.add(inkMesh);
    }

    const dotRadius = resolveSpaceMinimapDotRadius(model.radius);
    const dotGeometry = new THREE.SphereGeometry(dotRadius, 20, 14);
    const dotMaterial = new THREE.MeshBasicMaterial({
      name: "space_minimap_player_dot",
      color: SPACE_VISUAL_TOKENS.colors.signal,
      toneMapped: false,
      transparent: true,
      opacity: 0.96,
      depthTest: false,
    });
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    dot.renderOrder = 999;
    dot.raycast = () => null;
    dot.visible = false;
    scene.add(dot);

    const camera = new THREE.OrthographicCamera();
    const reducedMotion = readSpaceReducedMotionPreference();

    let renderer: WebGPURenderer | null = null;
    let disposed = false;
    let rafId = 0;
    let lastRenderMs = 0;
    let lastDampMs: number | null = null;
    let azimuthRad: number | null = null;
    let elevationRad: number | null = null;
    let viewportAspect = 1;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !renderer) return;
      const width = Math.max(Math.round(entry.contentRect.width), 1);
      const height = Math.max(Math.round(entry.contentRect.height), 1);
      viewportAspect = width / height;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SPACE_MINIMAP_MAX_DPR));
      renderer.setSize(width, height, false);
    });

    createWebGPURenderer({ canvas, alpha: true })
      .then((resolved) => {
        if (disposed) {
          resolved.dispose();
          return;
        }
        renderer = resolved;
        const width = Math.max(canvas.clientWidth, 1);
        const height = Math.max(canvas.clientHeight, 1);
        viewportAspect = width / height;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SPACE_MINIMAP_MAX_DPR));
        renderer.setSize(width, height, false);
        resizeObserver.observe(canvas);
      })
      .catch((error: unknown) => {
        if (disposed) return;
        if (import.meta.env.DEV) console.warn("[SpaceMinimap] renderer unavailable:", error);
        onFailed();
      });

    const renderFrame = (nowMs: number) => {
      rafId = window.requestAnimationFrame(renderFrame);
      if (!activeRef.current || !renderer) return;
      if (nowMs - lastRenderMs < SPACE_MINIMAP_FRAME_MS) return;
      lastRenderMs = nowMs;

      const pose = poseRef.current;
      const targetAzimuth = spaceMinimapAzimuthForYaw(pose?.yawRad ?? 0);
      const targetElevation = resolveSpaceMinimapElevationRad(pose?.pitchRad ?? 0);
      const dampDtSec =
        lastDampMs === null ? 0 : Math.min((nowMs - lastDampMs) / 1000, 0.1);
      lastDampMs = nowMs;
      if (azimuthRad === null || elevationRad === null || reducedMotion) {
        azimuthRad = targetAzimuth;
        elevationRad = targetElevation;
      } else {
        azimuthRad = dampSpaceMinimapAngleRad(
          azimuthRad,
          targetAzimuth,
          SPACE_MINIMAP_AZIMUTH_LAMBDA,
          dampDtSec,
        );
        elevationRad = dampSpaceMinimapAngleRad(
          elevationRad,
          targetElevation,
          SPACE_MINIMAP_AZIMUTH_LAMBDA,
          dampDtSec,
        );
      }

      fitSpaceMinimapCamera(camera, model.center, model.radius, azimuthRad, viewportAspect, elevationRad);

      if (pose) {
        dot.visible = true;
        dot.position.set(pose.position[0], pose.position[1] + dotRadius * 0.6, pose.position[2]);
      } else {
        dot.visible = false;
      }

      renderer.render(scene, camera);
    };
    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer?.dispose();
      layerMaterials.forEach((material) => material.dispose());
      dotGeometry.dispose();
      dotMaterial.dispose();
      for (const geometry of Object.values(model.layers)) geometry?.dispose();
      model.inkGeometry?.dispose();
      // 共享资源不随地图释放:墨线材质为主场景模块级缓存。
    };
  }, [gltf.scene, onFailed, poseRef]);

  return <canvas ref={canvasRef} className="space-minimap__canvas" />;
}

export function SpaceMinimap({
  poseRef,
  visible,
}: {
  poseRef: RefObject<SpacePlayerPose | null>;
  visible: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <div className="space-minimap" data-visible={visible || undefined} aria-hidden={!visible}>
      <SpaceMinimapErrorBoundary onFailed={() => setFailed(true)}>
        <Suspense fallback={null}>
          <SpaceMinimapCanvas poseRef={poseRef} active={visible} onFailed={() => setFailed(true)} />
        </Suspense>
      </SpaceMinimapErrorBoundary>
    </div>
  );
}
