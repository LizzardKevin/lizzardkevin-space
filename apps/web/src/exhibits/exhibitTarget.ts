import * as THREE from "three";
import { EXHIBIT_TARGET } from "../scenes/gallery/galleryConfig";

export type ExhibitTarget = {
  exhibitId: string;
  /** Label anchor: bbox top center + vertical offset (world space). */
  labelAnchor: THREE.Vector3;
  object: THREE.Object3D;
};

export function formatExhibitLabel(exhibitId: string): string {
  return exhibitId.replace(/_/g, " ");
}

const _box = new THREE.Box3();
const _center = new THREE.Vector3();

/** Camera distance to exhibit bbox center (world meters). */
export function exhibitDistanceFromCamera(camera: THREE.Camera, object: THREE.Object3D): number {
  _box.setFromObject(object);
  _box.getCenter(_center);
  return camera.position.distanceTo(_center);
}

export function isExhibitWithinRange(camera: THREE.Camera, object: THREE.Object3D): boolean {
  return exhibitDistanceFromCamera(camera, object) <= EXHIBIT_TARGET.maxDistance;
}

export function buildExhibitTarget(object: THREE.Object3D, exhibitId: string): ExhibitTarget {
  _box.setFromObject(object);
  _box.getCenter(_center);
  const labelAnchor = new THREE.Vector3(
    _center.x,
    _box.max.y + EXHIBIT_TARGET.labelOffsetY,
    _center.z,
  );
  return { exhibitId, labelAnchor, object };
}
