import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  loadManifest,
  type ExhibitLodKey,
  type ExhibitManifestItem,
  type ExhibitSceneConfig,
} from "../../exhibits/manifest.ts";
import { publishSpaceExhibitPlacementDebug } from "../debug/spaceMovementDebug";
import { GLTF_DRACO_DECODER_PATH } from "../gallery/galleryConfig";
import { collectExhibitAnchors, type ExhibitAnchorTransform } from "./exhibitAnchors.ts";
import {
  bindSceneExhibitId,
  chooseSceneExhibitLod,
  EXHIBIT_SNAP_MAX_FLOOR_DROP_M,
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

function applySceneScale(object: THREE.Object3D, scale: ExhibitSceneConfig["scale"]) {
  if (Array.isArray(scale)) object.scale.set(scale[0], scale[1], scale[2]);
  else object.scale.setScalar(scale);
}

function applyAnchorRotation(
  object: THREE.Object3D,
  anchor: ExhibitAnchorTransform,
  yawOffsetDeg: number,
) {
  const yaw = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    THREE.MathUtils.degToRad(yawOffsetDeg),
  );
  object.quaternion.copy(anchor.quaternion).multiply(yaw);
}

function resolveExhibitDistancePosition(
  sceneConfig: ExhibitSceneConfig,
  anchor: ExhibitAnchorTransform,
) {
  return sceneConfig.distanceAnchor
    ? new THREE.Vector3(...sceneConfig.distanceAnchor)
    : anchor.position;
}

function useSceneExhibits(enabled: boolean) {
  const [exhibits, setExhibits] = useState<ExhibitManifestItem[] | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadManifest()
      .then((manifest) => {
        if (cancelled) return;
        setExhibits(manifest.exhibits.filter((exhibit) => exhibit.scene));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (import.meta.env.DEV) console.error("[ExhibitPlacement] failed to load manifest", error);
        setExhibits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return enabled ? exhibits : null;
}

function DevSceneModelUrlCheck({ exhibit }: { exhibit: ExhibitManifestItem }) {
  useEffect(() => {
    if (!import.meta.env.DEV || !exhibit.scene) return;
    Array.from(new Set(Object.values(exhibit.scene.models))).forEach((url) => {
      fetch(url, { method: "HEAD" }).then((response) => {
        if (!response.ok) {
          console.error(`Exhibit ${exhibit.exhibitId} LOD file is missing: ${url}`);
        }
      });
    });
  }, [exhibit]);

  return null;
}

function MissingAnchorWarning({
  exhibit,
  onReady,
}: {
  exhibit: ExhibitManifestItem;
  onReady: (exhibitId: string) => void;
}) {
  useEffect(() => {
    onReady(exhibit.exhibitId);
    if (import.meta.env.DEV && exhibit.scene) {
      console.error(
        `Exhibit ${exhibit.exhibitId} references missing anchor ${exhibit.scene.anchor}`,
      );
    }
  }, [exhibit, onReady]);

  return null;
}

function SceneExhibitModel({
  exhibit,
  lod,
  anchor,
  root,
  onReady,
}: {
  exhibit: ExhibitManifestItem;
  lod: ExhibitLodKey;
  anchor: ExhibitAnchorTransform;
  root: THREE.Object3D;
  onReady: (exhibitId: string) => void;
}) {
  const sceneConfig = exhibit.scene!;

  const url = sceneConfig.models[lod];
  const gltf = useGLTF(url, GLTF_DRACO_DECODER_PATH);
  const placed = useMemo(() => {
    const object = gltf.scene.clone(true);
    cloneObjectMaterials(object);
    bindSceneExhibitId(object, exhibit.exhibitId);
    applySceneScale(object, sceneConfig.scale);
    applyAnchorRotation(object, anchor, sceneConfig.placement.yawOffsetDeg);
    object.position.set(0, 0, 0);
    object.updateMatrixWorld(true);

    let floorName: string | null = null;
    if (sceneConfig.placement.snap === "floor") {
      try {
        const snap = resolveExhibitFloorSnap({
          root,
          anchorPosition: anchor.position,
          exhibitObject: object,
          heightOffset: sceneConfig.placement.heightOffset,
        });
        object.position.copy(snap.position);
        floorName = snap.floorName;
      } catch (error) {
        object.position.copy(anchor.position);
        if (import.meta.env.DEV) {
          console.error(`${anchor.name} has no floor hit within ${EXHIBIT_SNAP_MAX_FLOOR_DROP_M}m`, error);
        }
      }
    } else {
      object.position.copy(anchor.position);
    }

    object.updateMatrixWorld(true);
    return { object, floorName };
  }, [anchor, exhibit.exhibitId, gltf.scene, root, sceneConfig]);

  useEffect(() => {
    publishSpaceExhibitPlacementDebug({
      timestamp: performance.now(),
      exhibitId: exhibit.exhibitId,
      anchorName: anchor.name,
      lod,
      floorName: placed.floorName,
    });
    onReady(exhibit.exhibitId);
  }, [anchor.name, exhibit.exhibitId, lod, onReady, placed.floorName]);

  return <primitive object={placed.object} />;
}

function SceneExhibitController({
  exhibit,
  anchor,
  root,
  onReady,
}: {
  exhibit: ExhibitManifestItem;
  anchor: ExhibitAnchorTransform;
  root: THREE.Object3D;
  onReady: (exhibitId: string) => void;
}) {
  const sceneConfig = exhibit.scene;
  const { camera } = useThree();
  const distancePosition = sceneConfig ? resolveExhibitDistancePosition(sceneConfig, anchor) : anchor.position;
  const initialLod = sceneConfig
    ? chooseSceneExhibitLod(camera.position.distanceTo(distancePosition), sceneConfig.load, null)
    : null;
  const [activeLod, setActiveLod] = useState<ExhibitLodKey | null>(initialLod);
  const activeLodRef = useRef<ExhibitLodKey | null>(initialLod);

  useFrame(() => {
    if (!sceneConfig) return;
    const distance = camera.position.distanceTo(distancePosition);
    const next = chooseSceneExhibitLod(distance, sceneConfig.load, activeLodRef.current);
    if (next === activeLodRef.current) return;
    activeLodRef.current = next;
    setActiveLod(next);
    publishSpaceExhibitPlacementDebug({
      timestamp: performance.now(),
      exhibitId: exhibit.exhibitId,
      anchorName: anchor.name,
      lod: next,
      floorName: null,
    });
  });

  useEffect(() => {
    if (activeLod === null) onReady(exhibit.exhibitId);
  }, [activeLod, exhibit.exhibitId, onReady]);

  if (!sceneConfig || !activeLod) return null;

  return (
    <>
      <DevSceneModelUrlCheck exhibit={exhibit} />
      <SceneExhibitModel
        key={`${exhibit.exhibitId}-${activeLod}`}
        exhibit={exhibit}
        lod={activeLod}
        anchor={anchor}
        root={root}
        onReady={onReady}
      />
    </>
  );
}

export function ExhibitPlacement({
  root,
  enabled = true,
  onReady,
}: {
  root: THREE.Object3D;
  enabled?: boolean;
  onReady?: () => void;
}) {
  const exhibits = useSceneExhibits(enabled);
  const anchors = useMemo(() => collectExhibitAnchors(root), [root]);
  const [readyIds, setReadyIds] = useState<Set<string>>(() => new Set());
  const readyCalledRef = useRef(false);

  const markExhibitReady = useCallback((exhibitId: string) => {
    setReadyIds((current) => {
      if (current.has(exhibitId)) return current;
      const next = new Set(current);
      next.add(exhibitId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!enabled || !exhibits) return;
    exhibits.forEach((exhibit) => {
      if (!exhibit.scene) return;
      Array.from(new Set(Object.values(exhibit.scene.models))).forEach((url) => {
        useGLTF.preload(url, GLTF_DRACO_DECODER_PATH);
      });
    });
  }, [enabled, exhibits]);

  useEffect(() => {
    if (!enabled || !exhibits) return;
    const ids = exhibits.map((exhibit) => exhibit.exhibitId);
    const allReady = ids.length === 0 || ids.every((id) => readyIds.has(id));
    if (!allReady || readyCalledRef.current) return;
    readyCalledRef.current = true;
    onReady?.();
  }, [enabled, exhibits, onReady, readyIds]);

  if (!enabled || !exhibits) return null;

  return (
    <>
      {exhibits.map((exhibit) => {
        const scene = exhibit.scene;
        if (!scene) return null;
        const anchor = anchors.get(scene.anchor);
        if (!anchor) {
          return (
            <MissingAnchorWarning
              key={exhibit.exhibitId}
              exhibit={exhibit}
              onReady={markExhibitReady}
            />
          );
        }
        return (
          <SceneExhibitController
            key={exhibit.exhibitId}
            exhibit={exhibit}
            anchor={anchor}
            root={root}
            onReady={markExhibitReady}
          />
        );
      })}
    </>
  );
}
