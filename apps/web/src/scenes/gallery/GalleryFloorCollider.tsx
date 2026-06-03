import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type * as THREE from "three";
import { useMemo } from "react";
import * as THREE_NS from "three";
import { PLAYER_CAPSULE_RADIUS } from "./resolveGallerySpawn";

function isMesh(obj: THREE.Object3D): obj is THREE.Mesh {
  return !!obj && (obj as THREE.Mesh).isMesh === true;
}

function isGalleryFloorCol(name: string) {
  return name.startsWith("COL_ground") || name.startsWith("COL_floor");
}

type XzRect = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

type FloorSpec = {
  key: string;
  position: [number, number, number];
  halfExtents: [number, number, number];
};

function collectPlatformCutouts(root: THREE.Object3D, padding: number): XzRect[] {
  const cutouts: XzRect[] = [];
  root.traverse((obj) => {
    if (!isMesh(obj) || !obj.name.startsWith("COL_platform")) return;
    const box = new THREE_NS.Box3().setFromObject(obj);
    if (box.max.y <= 0.05) return;
    cutouts.push({
      minX: box.min.x - padding,
      maxX: box.max.x + padding,
      minZ: box.min.z - padding,
      maxZ: box.max.z + padding,
    });
  });
  return cutouts;
}

function subtractXzRect(base: XzRect, hole: XzRect): XzRect[] {
  const ixMin = Math.max(base.minX, hole.minX);
  const ixMax = Math.min(base.maxX, hole.maxX);
  const izMin = Math.max(base.minZ, hole.minZ);
  const izMax = Math.min(base.maxZ, hole.maxZ);
  if (ixMin >= ixMax || izMin >= izMax) return [base];

  const pieces: XzRect[] = [];
  if (hole.maxZ < base.maxZ) {
    pieces.push({ minX: base.minX, maxX: base.maxX, minZ: hole.maxZ, maxZ: base.maxZ });
  }
  if (hole.minZ > base.minZ) {
    pieces.push({ minX: base.minX, maxX: base.maxX, minZ: base.minZ, maxZ: hole.minZ });
  }
  if (hole.minX > base.minX) {
    pieces.push({ minX: base.minX, maxX: hole.minX, minZ: izMin, maxZ: izMax });
  }
  if (hole.maxX < base.maxX) {
    pieces.push({ minX: hole.maxX, maxX: base.maxX, minZ: izMin, maxZ: izMax });
  }

  return pieces.filter((r) => r.maxX - r.minX > 0.05 && r.maxZ - r.minZ > 0.05);
}

function subtractMultipleHoles(base: XzRect, holes: XzRect[]): XzRect[] {
  let regions = [base];
  for (const hole of holes) {
    regions = regions.flatMap((region) => subtractXzRect(region, hole));
  }
  return regions;
}

function rectToFloorSpec(rect: XzRect, floorTopY: number, halfY: number, key: string): FloorSpec {
  const cx = (rect.minX + rect.maxX) / 2;
  const cz = (rect.minZ + rect.maxZ) / 2;
  return {
    key,
    position: [cx, floorTopY - halfY, cz],
    halfExtents: [(rect.maxX - rect.minX) / 2, halfY, (rect.maxZ - rect.minZ) / 2],
  };
}

function collectGalleryFloorColliders(root: THREE.Object3D): FloorSpec[] {
  root.updateMatrixWorld(true);
  const cutouts = collectPlatformCutouts(root, PLAYER_CAPSULE_RADIUS + 0.05);
  const floors: FloorSpec[] = [];
  const halfY = 0.04;

  root.traverse((obj) => {
    if (!isMesh(obj) || !isGalleryFloorCol(obj.name)) return;

    obj.updateMatrixWorld(true);
    const box = new THREE_NS.Box3().setFromObject(obj);
    const floorTopY = box.max.y;
    const base: XzRect = {
      minX: box.min.x,
      maxX: box.max.x,
      minZ: box.min.z,
      maxZ: box.max.z,
    };

    const regions = cutouts.length > 0 ? subtractMultipleHoles(base, cutouts) : [base];
    regions.forEach((rect, index) => {
      floors.push(rectToFloorSpec(rect, floorTopY, halfY, `${obj.uuid}-${index}`));
    });
  });

  return floors;
}

/** Thin box floor colliders — more reliable than trimesh for character controller. */
export function GalleryFloorCollider({ root }: { root: THREE.Object3D }) {
  const floors = useMemo(() => collectGalleryFloorColliders(root), [root]);
  if (floors.length === 0) return null;

  return (
    <>
      {floors.map((floor) => (
        <RigidBody key={floor.key} type="fixed" colliders={false} friction={1}>
          <CuboidCollider args={floor.halfExtents} position={floor.position} />
        </RigidBody>
      ))}
    </>
  );
}
