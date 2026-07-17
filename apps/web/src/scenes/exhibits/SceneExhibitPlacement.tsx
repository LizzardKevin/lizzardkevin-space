import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import type { ExhibitManifestItem, ExhibitSceneConfig } from "../../exhibits/manifest.ts";
import { publishSpaceExhibitPlacementDebug } from "../debug/spaceMovementDebug";
import { GLTF_DRACO_DECODER_PATH, ENABLE_GALLERY_INK_OUTLINES } from "../gallery/galleryConfig";
import { addExhibitInkOutline, disposeExhibitInkOutline } from "../gallery/galleryInkOutline.ts";
import { refreshStaticShadowMap } from "../gallery/galleryShadow.ts";
import { applyTreeHabitatSharedMaterials } from "./exhibitMaterialOverrides.ts";
import { configureSceneExhibitShadows } from "./sceneExhibitShadows.ts";
import { useRegisterExhibitInteractionTarget } from "./exhibitInteractionRegistry";
import {
  bindSceneExhibitId,
  EXHIBIT_SNAP_MAX_FLOOR_DROP_M,
  isSceneExhibitInRange,
  resolveExhibitFloorSnap,
} from "./exhibitPlacement.ts";

function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return (object as THREE.Mesh).isMesh === true;
}

function cloneObjectMaterials(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!isMesh(object)) return;
    if (Array.isArray(object.material)) object.material = object.material.map((material) => material.clone());
    else object.material = object.material.clone();
  });
}

function disposeSceneExhibitMaterials(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  root.traverse((object) => {
    if (!isMesh(object)) return;
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => materials.add(material));
      return;
    }
    materials.add(object.material);
  });
  materials.forEach((material) => material.dispose());
}

function applySceneScale(object: THREE.Object3D, scale: ExhibitSceneConfig["scale"]) {
  if (Array.isArray(scale)) object.scale.set(scale[0], scale[1], scale[2]);
  else object.scale.setScalar(scale);
}

function applyWorldRotation(object: THREE.Object3D, yawOffsetDeg: number) {
  const yaw = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    THREE.MathUtils.degToRad(yawOffsetDeg),
  );
  object.quaternion.copy(yaw);
}

function resolveExhibitDistancePosition(sceneConfig: ExhibitSceneConfig) {
  return new THREE.Vector3(...sceneConfig.distanceCenter);
}

function DevSceneModelUrlCheck({ exhibit }: { exhibit: ExhibitManifestItem }) {
  useEffect(() => {
    if (!import.meta.env.DEV || !exhibit.scene) return;
    fetch(exhibit.scene.modelUrl, { method: "HEAD" }).then((response) => {
      if (!response.ok) {
        console.error(`Exhibit ${exhibit.exhibitId} SPACE model file is missing: ${exhibit.scene?.modelUrl}`);
      }
    });
  }, [exhibit]);

  return null;
}

class SceneExhibitErrorBoundary extends Component<
  { exhibitId: string; onFailed: (exhibitId: string) => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) {
      console.error(`[ExhibitPlacement] failed to load ${this.props.exhibitId}`, error);
    }
    this.props.onFailed(this.props.exhibitId);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function SceneExhibitModel({
  exhibit,
  root,
  onReady,
}: {
  exhibit: ExhibitManifestItem;
  root: THREE.Object3D;
  onReady: (exhibitId: string) => void;
}) {
  const sceneConfig = exhibit.scene!;

  const url = sceneConfig.modelUrl;
  const gltf = useGLTF(url, GLTF_DRACO_DECODER_PATH);
  const placed = useMemo(() => {
    const object = gltf.scene.clone(true);
    cloneObjectMaterials(object);
    applyTreeHabitatSharedMaterials(object, exhibit.exhibitId);
    configureSceneExhibitShadows(object);
    bindSceneExhibitId(object, exhibit.exhibitId);
    applySceneScale(object, sceneConfig.scale);
    applyWorldRotation(object, sceneConfig.placement.yawOffsetDeg);
    object.position.set(0, 0, 0);
    object.updateMatrixWorld(true);

    let floorName: string | null = null;
    if (sceneConfig.placement.snap === "floor") {
      try {
        const snap = resolveExhibitFloorSnap({
          root,
          anchorPosition: resolveExhibitDistancePosition(sceneConfig),
          exhibitObject: object,
          heightOffset: sceneConfig.placement.heightOffset,
        });
        object.position.copy(snap.position);
        floorName = snap.floorName;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error(`${exhibit.exhibitId} has no floor hit within ${EXHIBIT_SNAP_MAX_FLOOR_DROP_M}m`, error);
        }
      }
    }

    object.updateMatrixWorld(true);
    return { object, floorName };
  }, [exhibit.exhibitId, gltf.scene, root, sceneConfig]);
  useRegisterExhibitInteractionTarget(placed.object);

  const scene = useThree((state) => state.scene);

  useEffect(() => {
    publishSpaceExhibitPlacementDebug({
      timestamp: performance.now(),
      exhibitId: exhibit.exhibitId,
      placementMode: "world",
      variant: "space",
      mounted: true,
      floorName: placed.floorName,
    });
    onReady(exhibit.exhibitId);
  }, [exhibit.exhibitId, onReady, placed.floorName]);

  useLayoutEffect(() => {
    // Setup must be replayable: React StrictMode rehearses effect cleanup/setup
    // without rerunning useMemo, so render-time shell creation would disappear.
    if (ENABLE_GALLERY_INK_OUTLINES) {
      addExhibitInkOutline(placed.object, gltf.scene);
    }
    // 展品 LOD 挂载/卸载会改变投影体集合：按需重渲一次静态阴影贴图。
    refreshStaticShadowMap(scene);
    return () => {
      // Dispose the ink shell first so the shared ink material is never
      // collected by disposeSceneExhibitMaterials below.
      disposeExhibitInkOutline(placed.object);
      disposeSceneExhibitMaterials(placed.object);
      refreshStaticShadowMap(scene);
    };
  }, [gltf.scene, placed.object, scene]);

  return <primitive object={placed.object} />;
}

function SceneExhibitController({
  exhibit,
  root,
  onReady,
  onDeferred,
}: {
  exhibit: ExhibitManifestItem;
  root: THREE.Object3D;
  onReady: (exhibitId: string) => void;
  onDeferred: (exhibitId: string) => void;
}) {
  const sceneConfig = exhibit.scene;
  const { camera } = useThree();
  const distancePosition = sceneConfig ? resolveExhibitDistancePosition(sceneConfig) : new THREE.Vector3();
  const initialInRange = sceneConfig
    ? isSceneExhibitInRange(camera.position.distanceTo(distancePosition), sceneConfig.load)
    : false;
  const [inRange, setInRange] = useState(initialInRange);
  const inRangeRef = useRef(initialInRange);

  useFrame(() => {
    if (!sceneConfig) return;
    const distance = camera.position.distanceTo(distancePosition);
    const next = isSceneExhibitInRange(distance, sceneConfig.load);
    if (next === inRangeRef.current) return;
    inRangeRef.current = next;
    setInRange(next);
    publishSpaceExhibitPlacementDebug({
      timestamp: performance.now(),
      exhibitId: exhibit.exhibitId,
      placementMode: "world",
      variant: "space",
      mounted: next,
      floorName: null,
    });
  });

  useEffect(() => {
    if (!inRange) onDeferred(exhibit.exhibitId);
  }, [inRange, exhibit.exhibitId, onDeferred]);

  if (!sceneConfig || !inRange) return null;

  return (
    <>
      <DevSceneModelUrlCheck exhibit={exhibit} />
      <Suspense fallback={null}>
        <SceneExhibitModel
          key={exhibit.exhibitId}
          exhibit={exhibit}
          root={root}
          onReady={onReady}
        />
      </Suspense>
    </>
  );
}

export function ExhibitPlacement({
  root,
  enabled = true,
  exhibits,
  onExhibitReady,
  onExhibitFailed,
  onExhibitDeferred,
}: {
  root: THREE.Object3D;
  enabled?: boolean;
  exhibits: ExhibitManifestItem[] | null;
  onExhibitReady: (exhibitId: string) => void;
  onExhibitFailed: (exhibitId: string) => void;
  onExhibitDeferred: (exhibitId: string) => void;
}) {
  if (!enabled || !exhibits) return null;

  return (
    <>
      {exhibits.map((exhibit) => {
        const scene = exhibit.scene;
        if (!scene) return null;
        return (
          <SceneExhibitErrorBoundary
            key={exhibit.exhibitId}
            exhibitId={exhibit.exhibitId}
            onFailed={onExhibitFailed}
          >
            <SceneExhibitController
              exhibit={exhibit}
              root={root}
              onReady={onExhibitReady}
              onDeferred={onExhibitDeferred}
            />
          </SceneExhibitErrorBoundary>
        );
      })}
    </>
  );
}
