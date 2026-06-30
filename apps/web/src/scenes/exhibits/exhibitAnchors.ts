import * as THREE from "three";

export const EXHIBIT_ANCHOR_PREFIX = "ANCHOR_";
export const EXHIBIT_WORLD_ORIGIN_ANCHOR = "ANCHOR_WORLD_ORIGIN";

export type ExhibitAnchorTransform = {
  name: string;
  object: THREE.Object3D;
  matrixWorld: THREE.Matrix4;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  euler: THREE.Euler;
  scale: THREE.Vector3;
};

export function isExhibitAnchorName(name: string) {
  return name.toUpperCase().startsWith(EXHIBIT_ANCHOR_PREFIX);
}

export function collectExhibitAnchors(root: THREE.Object3D) {
  const anchors = new Map<string, ExhibitAnchorTransform>();
  const originObject = new THREE.Object3D();
  originObject.name = EXHIBIT_WORLD_ORIGIN_ANCHOR;
  anchors.set(EXHIBIT_WORLD_ORIGIN_ANCHOR, {
    name: EXHIBIT_WORLD_ORIGIN_ANCHOR,
    object: originObject,
    matrixWorld: new THREE.Matrix4(),
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
    euler: new THREE.Euler(),
    scale: new THREE.Vector3(1, 1, 1),
  });

  root.updateMatrixWorld(true);

  root.traverse((object) => {
    if (!isExhibitAnchorName(object.name)) return;

    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const matrixWorld = object.matrixWorld.clone();
    matrixWorld.decompose(position, quaternion, scale);

    anchors.set(object.name, {
      name: object.name,
      object,
      matrixWorld,
      position,
      quaternion,
      euler: new THREE.Euler().setFromQuaternion(quaternion, "XYZ"),
      scale,
    });
  });

  return anchors;
}
