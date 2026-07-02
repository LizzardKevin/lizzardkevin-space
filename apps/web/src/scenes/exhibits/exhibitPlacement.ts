import * as THREE from "three";
import type { ExhibitSceneLoad } from "../../exhibits/manifest.ts";

export const EXHIBIT_SNAP_RAY_HEIGHT_M = 4;
export const EXHIBIT_SNAP_MAX_FLOOR_DROP_M = 8;

const FLOOR_NAME_PREFIXES = [
  "COL_FLOOR",
  "COL_GROUND",
  "COL_PLATFORM",
  "COL_STAIR",
  "ARCH_FLOOR",
  "STRUCT_FLOOR",
  "ARCH_STAIR",
  "STRUCT_STAIR",
] as const;

export type ExhibitFloorSnapResult = {
  position: THREE.Vector3;
  floorName: string;
  floorY: number;
};

function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return (object as THREE.Mesh).isMesh === true;
}

export function isExhibitFloorSnapTarget(object: THREE.Object3D) {
  const name = object.name.toUpperCase();
  return FLOOR_NAME_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export function isSceneExhibitInRange(distance: number, load: ExhibitSceneLoad): boolean {
  return distance <= load.unloadDistance;
}

export function bindSceneExhibitId(root: THREE.Object3D, exhibitId: string) {
  root.userData.exhibitId = exhibitId;
  root.traverse((object) => {
    object.userData.exhibitId = exhibitId;
  });
}

export function findSceneExhibitRoot(object: THREE.Object3D, exhibitId: string) {
  let root = object;
  let current: THREE.Object3D | null = object;
  while (current?.parent && current.parent.userData?.exhibitId === exhibitId) {
    root = current.parent;
    current = current.parent;
  }
  return root;
}

function collectFloorTargets(root: THREE.Object3D) {
  const targets: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (!isMesh(object)) return;
    if (!isExhibitFloorSnapTarget(object)) return;
    targets.push(object);
  });
  return targets;
}

export function resolveExhibitFloorSnap({
  root,
  anchorPosition,
  exhibitObject,
  heightOffset,
  rayHeight = EXHIBIT_SNAP_RAY_HEIGHT_M,
  maxFloorDrop = EXHIBIT_SNAP_MAX_FLOOR_DROP_M,
}: {
  root: THREE.Object3D;
  anchorPosition: THREE.Vector3;
  exhibitObject: THREE.Object3D;
  heightOffset: number;
  rayHeight?: number;
  maxFloorDrop?: number;
}): ExhibitFloorSnapResult {
  root.updateMatrixWorld(true);
  exhibitObject.updateMatrixWorld(true);

  const floorTargets = collectFloorTargets(root);
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(anchorPosition.x, anchorPosition.y + rayHeight, anchorPosition.z),
    new THREE.Vector3(0, -1, 0),
    0,
    rayHeight + maxFloorDrop,
  );
  const hit = raycaster.intersectObjects(floorTargets, true)[0];
  if (!hit) {
    throw new Error(`anchor has no floor hit within ${maxFloorDrop}m`);
  }

  const box = new THREE.Box3().setFromObject(exhibitObject);
  const bottomCenter = new THREE.Vector3(
    (box.min.x + box.max.x) / 2,
    box.min.y,
    (box.min.z + box.max.z) / 2,
  );
  const position = exhibitObject.position.clone().add(
    new THREE.Vector3(
      hit.point.x - bottomCenter.x,
      hit.point.y + heightOffset - bottomCenter.y,
      hit.point.z - bottomCenter.z,
    ),
  );

  return {
    position,
    floorName: hit.object.name || hit.object.parent?.name || "unknown-floor",
    floorY: hit.point.y,
  };
}
