import * as THREE from "three";

export type BakedTrimesh = {
  vertices: Float32Array;
  indices: Uint32Array;
};

/**
 * Bake a mesh into root-local space for Rapier TrimeshCollider.
 * Double-sided duplicates reversed triangles so interior walls / stairs work
 * regardless of Blender winding.
 */
export function bakeMeshTrimesh(
  mesh: THREE.Mesh,
  root: THREE.Object3D,
  options?: { doubleSided?: boolean },
): BakedTrimesh {
  root.updateMatrixWorld(true);
  mesh.updateMatrixWorld(true);

  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const toRoot = new THREE.Matrix4().multiplyMatrices(rootInv, mesh.matrixWorld);

  const geometry = mesh.geometry.clone();
  const posAttr = geometry.attributes.position;
  if (!posAttr) {
    return { vertices: new Float32Array(), indices: new Uint32Array() };
  }

  const vertex = new THREE.Vector3();
  const vertices = new Float32Array(posAttr.count * 3);
  for (let i = 0; i < posAttr.count; i++) {
    vertex.fromBufferAttribute(posAttr, i).applyMatrix4(toRoot);
    vertices[i * 3] = vertex.x;
    vertices[i * 3 + 1] = vertex.y;
    vertices[i * 3 + 2] = vertex.z;
  }

  let indices: Uint32Array;
  if (geometry.index) {
    const src = geometry.index.array;
    const triCount = src.length;
    if (options?.doubleSided) {
      indices = new Uint32Array(triCount * 2);
      for (let i = 0; i < triCount; i++) indices[i] = src[i]!;
      for (let i = 0; i < triCount; i += 3) {
        indices[triCount + i] = src[i + 2]!;
        indices[triCount + i + 1] = src[i + 1]!;
        indices[triCount + i + 2] = src[i]!;
      }
    } else {
      indices = Uint32Array.from(src);
    }
  } else {
    const triCount = posAttr.count;
    if (options?.doubleSided) {
      indices = new Uint32Array(triCount * 2);
      for (let i = 0; i < triCount; i++) indices[i] = i;
      for (let i = 0; i < triCount; i += 3) {
        indices[triCount + i] = i + 2;
        indices[triCount + i + 1] = i + 1;
        indices[triCount + i + 2] = i;
      }
    } else {
      indices = new Uint32Array(triCount);
      for (let i = 0; i < triCount; i++) indices[i] = i;
    }
  }

  geometry.dispose();
  return { vertices, indices };
}
