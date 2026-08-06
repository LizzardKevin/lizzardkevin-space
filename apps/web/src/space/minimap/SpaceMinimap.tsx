import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { WebGPURenderer } from "three/webgpu";
import { createWebGPURenderer } from "../../rendering/createWebGPURenderer";
import { GALLERY_GLB_URL, GLTF_DRACO_DECODER_PATH } from "../../scenes/gallery/galleryConfig";
import { spaceExplorationStore } from "../quests/spaceQuests";
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
import {
  buildSpaceHologramModel,
  buildSpaceMinimapModel,
  computeSpaceArchitectureBounds,
  createSpaceMinimapWorldMapper,
  SPACE_MINIMAP_GLB_URL,
  SPACE_MINIMAP_GLB_WORLD_ALIGNED,
  SPACE_MINIMAP_SOURCE,
} from "./minimapModel";
import { resolveSpaceMinimapFloorAt } from "./minimapFloorDetect";

/**
 * 右上角全息小地图:独立 canvas + 独立 WebGPU/WebGL2 渲染器(叠层先例:
 * work-focus overlay canvas),不进入主 Canvas 的 R3F/后处理管线。
 * 显示模型 = 离线生成的剥离 GLB(space_minimap_strip.glb,世界坐标,
 * `npm run minimap:generate` 与运行时 strip 同一套管线);纯白 basic + 分层透明度
 * (楼板实、墙体虚,层层叠加出体积);玩家点直读 pose.position。
 * 正交相机 heading-up 跟随玩家 yaw、仰角随 pitch 轻微反向跟随,
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

/** 楼梯段默认近隐形(防细部噪声),被踩中点亮时才显形。 */
const SPACE_MINIMAP_STAIR_DEFAULT_OPACITY = 0.08;

/** 站立面点亮:半透明墨绿;点亮 260ms 微回弹,熄灭 420ms 缓收。 */
const SPACE_MINIMAP_PIECE_HIGHLIGHT = { color: "#2f5d52", opacity: 0.6 } as const;
const SPACE_MINIMAP_HIGHLIGHT_IN_MS = 260;
const SPACE_MINIMAP_HIGHLIGHT_OUT_MS = 420;

function easeOutBack(t: number) {
  const c = 1.35;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

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
  const galleryGltf = useGLTF(GALLERY_GLB_URL, GLTF_DRACO_DECODER_PATH);
  const holoGltf = useGLTF(SPACE_MINIMAP_GLB_URL, false);
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const model =
      SPACE_MINIMAP_SOURCE === "hologram"
        ? buildSpaceHologramModel(holoGltf.scene)
        : buildSpaceMinimapModel(galleryGltf.scene);
    if (!model) {
      if (import.meta.env.DEV) console.warn("[SpaceMinimap] no map geometry from source:", SPACE_MINIMAP_SOURCE);
      onFailed();
      return;
    }
    // 玩家点坐标:strip 路径与生成的 GLB 都在世界坐标系,直接用 pose;
    // 仅当 GLB 为局部归一坐标时才需要世界盒映射。
    const worldBounds =
      SPACE_MINIMAP_SOURCE === "hologram" && !SPACE_MINIMAP_GLB_WORLD_ALIGNED
        ? computeSpaceArchitectureBounds(galleryGltf.scene)
        : null;
    const mapWorldPose = worldBounds
      ? createSpaceMinimapWorldMapper(worldBounds, model.center, model.radius)
      : null;

    const scene = new THREE.Scene();
    scene.name = "space_minimap_scene";

    // 纯白 basic 全息:不受光照、不被色调映射压暗;逐块步行面独立材质供点亮。
    const layerMaterials: THREE.MeshBasicMaterial[] = [];
    const pieceEntries: {
      name: string;
      kind: "floor" | "stair";
      material: THREE.MeshBasicMaterial;
    }[] = [];
    for (const piece of model.floorPieces) {
      const material = new THREE.MeshBasicMaterial({
        name: `space_minimap_piece_${piece.name}`,
        color: SPACE_VISUAL_TOKENS.colors.paper,
        toneMapped: false,
        transparent: true,
        opacity:
          piece.kind === "stair"
            ? SPACE_MINIMAP_STAIR_DEFAULT_OPACITY
            : SPACE_MINIMAP_LAYER_OPACITY.floor,
        depthWrite: false,
      });
      layerMaterials.push(material);
      const mesh = new THREE.Mesh(piece.geometry, material);
      mesh.renderOrder = 1;
      mesh.raycast = () => null;
      scene.add(mesh);
      pieceEntries.push({ name: piece.name, kind: piece.kind, material });
    }
    for (const layer of ["wall", "other"] as const) {
      const geometry = layer === "wall" ? model.wallGeometry : model.otherGeometry;
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
      // 不用主场景共享的实色墨线:实心 BackSide 壳会把全息体蒙成不透明。
      // 本地半透明墨线,既保留粗线轮廓,又让墙面真的透光。
      const inkMaterial = new THREE.MeshBasicMaterial({
        name: "space_minimap_ink",
        color: SPACE_VISUAL_TOKENS.colors.inkOutline,
        toneMapped: false,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.28,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
      layerMaterials.push(inkMaterial);
      const inkMesh = new THREE.Mesh(model.inkGeometry, inkMaterial);
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

    // 站立面高亮状态机:点亮 easeOutBack 微回弹,熄灭 easeInOutCubic 缓收。
    type PieceTween = {
      fromOpacity: number;
      toOpacity: number;
      fromColor: THREE.Color;
      toColor: THREE.Color;
      startMs: number;
      durationMs: number;
      ease: (t: number) => number;
    };
    const pieceTweens = new Map<string, PieceTween>();
    let currentPieceName: string | null = null;
    const highlightColor = new THREE.Color(SPACE_MINIMAP_PIECE_HIGHLIGHT.color);
    const paperColor = new THREE.Color(SPACE_VISUAL_TOKENS.colors.paper);

    const retargetPiece = (
      entry: (typeof pieceEntries)[number],
      target: "highlight" | "default",
      nowMs: number,
    ) => {
      const toOpacity =
        target === "highlight"
          ? SPACE_MINIMAP_PIECE_HIGHLIGHT.opacity
          : entry.kind === "stair"
            ? SPACE_MINIMAP_STAIR_DEFAULT_OPACITY
            : SPACE_MINIMAP_LAYER_OPACITY.floor;
      const toColor = target === "highlight" ? highlightColor : paperColor;
      if (reducedMotion) {
        entry.material.opacity = toOpacity;
        entry.material.color.copy(toColor);
        pieceTweens.delete(entry.name);
        return;
      }
      pieceTweens.set(entry.name, {
        fromOpacity: entry.material.opacity,
        toOpacity,
        fromColor: entry.material.color.clone(),
        toColor: toColor.clone(),
        startMs: nowMs,
        durationMs: target === "highlight" ? SPACE_MINIMAP_HIGHLIGHT_IN_MS : SPACE_MINIMAP_HIGHLIGHT_OUT_MS,
        ease: target === "highlight" ? easeOutBack : easeInOutCubic,
      });
    };

    const pieceByName = new Map(pieceEntries.map((entry) => [entry.name, entry]));
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

      // 站立面检测(与点同一坐标系)与高亮补间推进
      const detectPos = pose ? (mapWorldPose ? mapWorldPose(pose.position) : pose.position) : null;
      const nextPieceName = detectPos
        ? resolveSpaceMinimapFloorAt(model.floorPieces, detectPos)
        : null;
      if (nextPieceName !== currentPieceName) {
        const previousPieceName = currentPieceName;
        currentPieceName = nextPieceName;
        for (const entry of pieceEntries) {
          if (entry.name === nextPieceName) retargetPiece(entry, "highlight", nowMs);
          else if (entry.name === previousPieceName) retargetPiece(entry, "default", nowMs);
        }
      }
      for (const [name, tween] of pieceTweens) {
        const entry = pieceByName.get(name);
        if (!entry) {
          pieceTweens.delete(name);
          continue;
        }
        const t = Math.min((nowMs - tween.startMs) / tween.durationMs, 1);
        const eased = tween.ease(t);
        entry.material.opacity = tween.fromOpacity + (tween.toOpacity - tween.fromOpacity) * eased;
        entry.material.color.lerpColors(tween.fromColor, tween.toColor, Math.min(Math.max(eased, 0), 1));
        if (t >= 1) {
          entry.material.opacity = tween.toOpacity;
          entry.material.color.copy(tween.toColor);
          pieceTweens.delete(name);
        }
      }

      if (pose) {
        dot.visible = true;
        const [mapX, mapY, mapZ] = mapWorldPose ? mapWorldPose(pose.position) : pose.position;
        dot.position.set(mapX, mapY + dotRadius * 0.6, mapZ);
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
      for (const piece of model.floorPieces) piece.geometry.dispose();
      model.wallGeometry?.dispose();
      model.otherGeometry?.dispose();
      model.inkGeometry?.dispose();
      // 共享资源不随地图释放:墨线材质为主场景模块级缓存。
    };
  }, [galleryGltf.scene, holoGltf.scene, onFailed, poseRef]);

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
  // 必须稳定:内联箭头每次渲染都是新身份,会把 SpaceMinimapCanvas 的
  // 重型 effect(建模 + 初始化渲染器)反复拆建——表现为点击/悬停时画面卡顿、地图闪烁。
  const handleFailed = useCallback(() => setFailed(true), []);
  // 出现逻辑与探索提示一致:进入下坡走廊(阶段 active)才出现;
  // 且渲染器只在首次激活后初始化——不在新手引导/冷启动期创建第二个 WebGPU 上下文。
  const exploration = useSyncExternalStore(spaceExplorationStore.subscribe, spaceExplorationStore.getState);
  const shown = visible && exploration.phase === "active";
  const [activated, setActivated] = useState(false);
  // 首次激活(render 期派生,非 effect)才初始化渲染器;之后保持挂载避免拆建。
  if (shown && !activated) setActivated(true);

  if (failed) return null;

  return (
    <div className="space-minimap" data-visible={shown || undefined} aria-hidden={!shown}>
      <SpaceMinimapErrorBoundary onFailed={handleFailed}>
        <Suspense fallback={null}>
          {activated ? (
            <SpaceMinimapCanvas poseRef={poseRef} active={shown} onFailed={handleFailed} />
          ) : null}
        </Suspense>
      </SpaceMinimapErrorBoundary>
    </div>
  );
}
