import { CuboidCollider, RigidBody, TrimeshCollider } from "@react-three/rapier";
import type * as THREE from "three";
import { useMemo } from "react";
import * as THREE_NS from "three";
import { bakeMeshTrimesh } from "./trimeshColliderUtils";

const INNER_COL_PREFIX = "COL_inner";
const PROP_PREFIX = "prop_";

function isMesh(obj: THREE.Object3D): obj is THREE.Mesh {
  return !!obj && (obj as THREE.Mesh).isMesh === true;
}

/** Thin slab floors — handled by GalleryFloorCollider, not here. */
function isGalleryFloorCol(name: string) {
  return name.startsWith("COL_ground") || name.startsWith("COL_floor");
}

type TrimeshSpec = {
  key: string;
  vertices: Float32Array;
  indices: Uint32Array;
};

type CuboidSpec = {
  key: string;
  halfExtents: [number, number, number];
  position: [number, number, number];
};

function colNameForProp(propName: string) {
  if (!propName.startsWith(PROP_PREFIX)) return null;
  return `COL_${propName.slice(PROP_PREFIX.length)}`;
}

function pushCuboidFromMesh(
  obj: THREE.Mesh,
  rootInv: THREE_NS.Matrix4,
  cuboids: CuboidSpec[],
  key: string,
) {
  obj.updateMatrixWorld(true);
  const box = new THREE_NS.Box3().setFromObject(obj);
  const size = box.getSize(new THREE_NS.Vector3());
  const center = box.getCenter(new THREE_NS.Vector3());
  center.applyMatrix4(rootInv);
  cuboids.push({
    key,
    halfExtents: [
      Math.max(size.x / 2, 0.05),
      Math.max(size.y / 2, 0.05),
      Math.max(size.z / 2, 0.05),
    ],
    position: [center.x, center.y, center.z],
  });
}

function collectColSpecs(root: THREE.Object3D): { trimeshes: TrimeshSpec[]; cuboids: CuboidSpec[] } {
  root.updateMatrixWorld(true);
  const rootInv = new THREE_NS.Matrix4().copy(root.matrixWorld).invert();
  const trimeshes: TrimeshSpec[] = [];
  const cuboids: CuboidSpec[] = [];
  const colMeshNames = new Set<string>();

  root.traverse((obj) => {
    if (isMesh(obj) && obj.name.startsWith("COL_")) colMeshNames.add(obj.name);
  });

  root.traverse((obj) => {
    if (!isMesh(obj)) return;
    if (!obj.name || !obj.name.startsWith("COL_")) return;
    if (isGalleryFloorCol(obj.name)) return;

    obj.updateMatrixWorld(true);

    if (obj.name.startsWith(INNER_COL_PREFIX)) {
      pushCuboidFromMesh(obj, rootInv, cuboids, obj.uuid);
      return;
    }

    const baked = bakeMeshTrimesh(obj, root, { doubleSided: true });
    if (baked.vertices.length === 0 || baked.indices.length === 0) return;

    trimeshes.push({
      key: obj.uuid,
      vertices: baked.vertices,
      indices: baked.indices,
    });
  });

  // prop_* 无同名 COL_* 时，用包围盒 cuboid 兜底（如 COL_sidetable_1 缺失）。
  root.traverse((obj) => {
    if (!isMesh(obj) || !obj.name.startsWith(PROP_PREFIX)) return;
    const expectedCol = colNameForProp(obj.name);
    if (!expectedCol || colMeshNames.has(expectedCol)) return;
    if (import.meta.env.DEV) {
      console.info(`[ColColliders] fallback cuboid for missing ${expectedCol} ← ${obj.name}`);
    }
    pushCuboidFromMesh(obj, rootInv, cuboids, `prop-fallback-${obj.uuid}`);
  });

  return { trimeshes, cuboids };
}

export function ColColliders({ root }: { root: THREE.Object3D }) {
  const { trimeshes, cuboids } = useMemo(() => collectColSpecs(root), [root]);

  return (
    <>
      {cuboids.map((c) => (
        <RigidBody key={c.key} type="fixed" colliders={false}>
          <CuboidCollider args={c.halfExtents} position={c.position} />
        </RigidBody>
      ))}
      {trimeshes.map((c) => (
        <RigidBody key={c.key} type="fixed" colliders={false}>
          <TrimeshCollider args={[c.vertices, c.indices]} />
        </RigidBody>
      ))}
    </>
  );
}
