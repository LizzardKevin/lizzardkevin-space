import * as THREE from "three";
import { bindExhibitIds } from "./bindExhibitIds";
import {
  ENABLE_GALLERY_OVERRIDE_MATERIALS,
  ENABLE_GALLERY_RUNTIME_SHADOWS,
  ENABLE_GALLERY_TOON,
  GALLERY_SURFACE_COLOR,
} from "./galleryConfig";
import { createGalleryToonMaterial } from "./galleryToonMaterial";

function isMesh(obj: THREE.Object3D): obj is THREE.Mesh {
  return !!obj && (obj as THREE.Mesh).isMesh === true;
}

export type BulbLightSpec = {
  name: string;
  position: [number, number, number];
};

const TEMP_BLOCKER_NAME_PATTERN = /^TEMP_BLOCKER(?:_|$)/i;

export function isTempBlockerMeshName(name: string): boolean {
  return TEMP_BLOCKER_NAME_PATTERN.test(name.replace(/\.\d{3}$/, ""));
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) material.forEach((m) => m.dispose());
  else material.dispose();
}

function createTempBlockerFrostedMaterial() {
  const material = new THREE.MeshPhysicalMaterial({
    name: "runtime_temp_blocker_frosted_physical",
    color: new THREE.Color(0xe2ded5),
    metalness: 0,
    roughness: 1,
    transmission: 0.34,
    thickness: 1.2,
    attenuationDistance: 0.72,
    attenuationColor: new THREE.Color(0xf0ece4),
    ior: 1.18,
    clearcoat: 0.08,
    clearcoatRoughness: 1,
    opacity: 1,
    side: THREE.DoubleSide,
  });
  material.depthWrite = true;
  material.forceSinglePass = true;
  return material;
}

/** Gallery surface: toon cel bands (Firewatch-style) or flat basic fallback. */
function applyGallerySurfaceMaterial(mesh: THREE.Mesh, color: string) {
  if (mesh.name.startsWith("bulb_")) return;

  if (mesh.material) disposeMaterial(mesh.material);
  mesh.material = ENABLE_GALLERY_TOON
    ? createGalleryToonMaterial(color)
    : new THREE.MeshBasicMaterial({ color });
}

export function prepareGalleryScene(root: THREE.Object3D) {
  bindExhibitIds(root);

  const bulbs: BulbLightSpec[] = [];
  const seen = new Map<string, THREE.Mesh>();
  const tempBlockerMaterial = createTempBlockerFrostedMaterial();
  let assignedTempBlockerMaterial = false;

  root.traverse((obj) => {
    if (!isMesh(obj)) return;

    if (obj.name.startsWith("COL_")) {
      obj.visible = false;
      return;
    }

    // 同一平面随镜头转动“匀速明暗变化”更像是重叠面在抢深度（z-fighting）。
    // 这里做一次性去重：同一 geometry + 几乎相同 world matrix 的 mesh，隐藏后出现的重复项。
    obj.updateWorldMatrix(true, false);
    const e = obj.matrixWorld.elements;
    const key =
      `${obj.geometry.uuid}|` +
      `${Math.round(e[12] * 1000)},${Math.round(e[13] * 1000)},${Math.round(e[14] * 1000)}|` +
      `${Math.round(e[0] * 1000)},${Math.round(e[5] * 1000)},${Math.round(e[10] * 1000)}`;
    if (seen.has(key)) {
      obj.visible = false;
      return;
    }
    seen.set(key, obj);

    const isTempBlocker = isTempBlockerMeshName(obj.name);

    if (ENABLE_GALLERY_OVERRIDE_MATERIALS && !isTempBlocker) {
      applyGallerySurfaceMaterial(obj, GALLERY_SURFACE_COLOR);
    }

    if (isTempBlocker) {
      if (obj.material && obj.material !== tempBlockerMaterial) disposeMaterial(obj.material);
      obj.material = tempBlockerMaterial;
      assignedTempBlockerMaterial = true;
      obj.renderOrder = Math.max(obj.renderOrder, 20);
    }

    obj.castShadow = ENABLE_GALLERY_RUNTIME_SHADOWS && !isTempBlocker;
    obj.receiveShadow = ENABLE_GALLERY_RUNTIME_SHADOWS && !isTempBlocker;

    if (obj.name.startsWith("bulb_")) {
      bulbs.push({
        name: obj.name,
        position: [obj.position.x, obj.position.y, obj.position.z],
      });
    }
  });

  if (!assignedTempBlockerMaterial) tempBlockerMaterial.dispose();

  return { bulbs };
}
