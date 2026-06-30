import * as THREE from "three";
import { EXHIBIT_TARGET } from "../scenes/gallery/galleryConfig.ts";

export type ExhibitTarget = {
  exhibitId: string;
  /** Label anchor: bbox top center + vertical offset (world space). */
  labelAnchor: THREE.Vector3;
  object: THREE.Object3D;
};

const EXHIBIT_LABELS: Record<string, string> = {
  arch_treehabitat: "Tree Habitat",
  arch_uabb_exhibit: "UABB Exhibit",
  arch_3d_printing_architecture: "3D Printing Architecture",
  space_onboarding_demo: "SPACE GUIDE",
};

export function formatExhibitLabel(exhibitId: string): string {
  const label = EXHIBIT_LABELS[exhibitId];
  if (label) return label;
  return exhibitId.replace(/_/g, " ");
}

const _box = new THREE.Box3();
const _center = new THREE.Vector3();

function readExplicitLabelAnchor(object: THREE.Object3D): [number, number, number] | null {
  const anchor = object.userData?.exhibitLabelAnchor;
  if (!Array.isArray(anchor) || anchor.length !== 3) return null;
  if (!anchor.every((value) => typeof value === "number" && Number.isFinite(value))) return null;
  return anchor as [number, number, number];
}

export function computeExhibitLabelAnchor(
  object: THREE.Object3D,
  target: THREE.Vector3 = new THREE.Vector3(),
): THREE.Vector3 {
  const explicitAnchor = readExplicitLabelAnchor(object);
  if (explicitAnchor) return target.set(explicitAnchor[0], explicitAnchor[1], explicitAnchor[2]);

  _box.setFromObject(object);
  _box.getCenter(_center);
  return target.set(_center.x, _box.max.y + EXHIBIT_TARGET.labelOffsetY, _center.z);
}

/** Camera distance to exhibit bbox center (world meters). */
export function exhibitDistanceFromCamera(camera: THREE.Camera, object: THREE.Object3D): number {
  _box.setFromObject(object);
  _box.getCenter(_center);
  return camera.position.distanceTo(_center);
}

export function isExhibitWithinRange(camera: THREE.Camera, object: THREE.Object3D): boolean {
  return exhibitDistanceFromCamera(camera, object) <= resolveExhibitTargetMaxDistance(object);
}

function resolveExhibitTargetMaxDistance(object: THREE.Object3D): number {
  let current: THREE.Object3D | null = object;
  while (current) {
    const maxDistance = current.userData?.exhibitMaxDistance;
    if (typeof maxDistance === "number" && Number.isFinite(maxDistance) && maxDistance > 0) {
      return maxDistance;
    }
    current = current.parent;
  }
  return EXHIBIT_TARGET.maxDistance;
}

export function buildExhibitTarget(object: THREE.Object3D, exhibitId: string): ExhibitTarget {
  const labelAnchor = computeExhibitLabelAnchor(object);
  return { exhibitId, labelAnchor, object };
}
