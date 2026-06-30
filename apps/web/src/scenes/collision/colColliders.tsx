import { RigidBody, TrimeshCollider, type RapierCollider } from "@react-three/rapier";
import type * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { registerSpaceCollisionDebugCollider } from "../debug/spaceMovementDebug";
import { bakeMeshTrimesh } from "./trimeshColliderUtils";

function isMesh(obj: THREE.Object3D): obj is THREE.Mesh {
  return !!obj && (obj as THREE.Mesh).isMesh === true;
}

type TrimeshSpec = {
  key: string;
  debugName: string;
  vertices: Float32Array;
  indices: Uint32Array;
};

function collectColSpecs(root: THREE.Object3D): TrimeshSpec[] {
  root.updateMatrixWorld(true);
  const trimeshes: TrimeshSpec[] = [];

  root.traverse((obj) => {
    if (!isMesh(obj)) return;
    if (!obj.name || !obj.name.startsWith("COL_")) return;

    obj.updateMatrixWorld(true);

    const baked = bakeMeshTrimesh(obj, root, { doubleSided: true });
    if (baked.vertices.length === 0 || baked.indices.length === 0) return;

    trimeshes.push({
      key: obj.uuid,
      debugName: obj.name,
      vertices: baked.vertices,
      indices: baked.indices,
    });
  });

  return trimeshes;
}

function RegisteredTrimeshCollider({ spec }: { spec: TrimeshSpec }) {
  const colliderRef = useRef<RapierCollider>(null);

  useEffect(() => {
    return registerSpaceCollisionDebugCollider(colliderRef.current, spec.debugName);
  }, [spec.debugName]);

  return <TrimeshCollider ref={colliderRef} name={spec.debugName} args={[spec.vertices, spec.indices]} />;
}

export function ColColliders({ root }: { root: THREE.Object3D }) {
  const trimeshes = useMemo(() => collectColSpecs(root), [root]);

  return (
    <>
      {trimeshes.map((c) => (
        <RigidBody key={c.key} type="fixed" colliders={false}>
          <RegisteredTrimeshCollider spec={c} />
        </RigidBody>
      ))}
    </>
  );
}
