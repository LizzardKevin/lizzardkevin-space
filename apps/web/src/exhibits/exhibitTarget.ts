import * as THREE from "three";
import { generatedExhibitLabels } from "../generated/exhibitLabels.generated.ts";
import { EXHIBIT_TARGET } from "../scenes/gallery/galleryConfig.ts";
import type { SupportedLanguage } from "../i18n/resolveInitialLanguage";

export type ExhibitTarget = {
  exhibitId: string;
  interactionKind: "exhibit" | "projector";
  object: THREE.Object3D;
  suppressHoverHighlight?: boolean;
};

const EXHIBIT_LABELS = generatedExhibitLabels as Record<string, Record<SupportedLanguage, string>>;

export function formatExhibitLabel(exhibitId: string, language: SupportedLanguage = "en"): string {
  const label = EXHIBIT_LABELS[exhibitId];
  if (label) return label[language] ?? label.en;
  return exhibitId.replace(/_/g, " ");
}

const _center = new THREE.Vector3();
const _box = new THREE.Box3();

function computeObjectCenter(object: THREE.Object3D, target: THREE.Vector3 = _center): THREE.Vector3 {
  _box.setFromObject(object);
  return _box.getCenter(target);
}

/** Camera distance to exhibit bbox center (world meters). */
export function exhibitDistanceFromCamera(camera: THREE.Camera, object: THREE.Object3D): number {
  return camera.position.distanceTo(computeObjectCenter(object));
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

function readExhibitTargetFlags(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  let interactionKind: ExhibitTarget["interactionKind"] = "exhibit";
  let suppressHoverHighlight = false;

  while (current) {
    if (current.userData?.interactionKind === "projector") {
      interactionKind = "projector";
    }
    if (current.userData?.disableExhibitHoverHighlight === true) {
      suppressHoverHighlight = true;
    }
    current = current.parent;
  }

  return { interactionKind, suppressHoverHighlight };
}

export function buildExhibitTarget(object: THREE.Object3D, exhibitId: string): ExhibitTarget {
  return { exhibitId, object, ...readExhibitTargetFlags(object) };
}
