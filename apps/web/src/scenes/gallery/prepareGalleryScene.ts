import * as THREE from "three";
import { bindExhibitIds } from "./bindExhibitIds.ts";
import {
  ENABLE_GALLERY_INK_OUTLINES,
  ENABLE_GALLERY_OVERRIDE_MATERIALS,
  ENABLE_GALLERY_RUNTIME_SHADOWS,
  ENABLE_GALLERY_SELECTIVE_STYLIZATION,
  ENABLE_GALLERY_TOON,
  GALLERY_INK,
  GALLERY_SURFACE_COLOR,
} from "./galleryConfig.ts";
import { createGalleryToonMaterial } from "./galleryToonMaterial.ts";
import {
  addGalleryInkOutline,
  GALLERY_INK_OUTLINE_EXCLUDED_PREFIXES,
  type GalleryInkShellSource,
} from "./galleryInkOutline.ts";
import {
  applyGallerySceneMaterialStyle,
  getGalleryMaterialStyleAction,
  isGalleryLightMesh,
} from "./galleryStyleMaterials.ts";

function isMesh(obj: THREE.Object3D): obj is THREE.Mesh {
  return !!obj && (obj as THREE.Mesh).isMesh === true;
}

export type BulbLightSpec = {
  name: string;
  position: [number, number, number];
};

export type GalleryLightHaloSpec = {
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
  const lightHalos: GalleryLightHaloSpec[] = [];
  const seen = new Map<string, THREE.Mesh>();
  const tempBlockerMaterial = createTempBlockerFrostedMaterial();
  const worldPosition = new THREE.Vector3();
  const inkSources: GalleryInkShellSource[] = [];
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
    } else if (ENABLE_GALLERY_SELECTIVE_STYLIZATION && !isTempBlocker) {
      applyGallerySceneMaterialStyle(obj);
    }

    if (
      ENABLE_GALLERY_INK_OUTLINES &&
      !isTempBlocker &&
      getGalleryMaterialStyleAction(obj.name) === "stylize" &&
      !GALLERY_INK_OUTLINE_EXCLUDED_PREFIXES.some((prefix) => obj.name.startsWith(prefix)) &&
      !GALLERY_INK.exemptPatterns.some((pattern) => pattern.test(obj.name))
    ) {
      inkSources.push({ geometry: obj.geometry, matrixWorld: obj.matrixWorld });
    }

    if (isTempBlocker) {
      if (obj.material && obj.material !== tempBlockerMaterial) disposeMaterial(obj.material);
      obj.material = tempBlockerMaterial;
      assignedTempBlockerMaterial = true;
      obj.renderOrder = Math.max(obj.renderOrder, 20);
    }

    // 玻璃与发光灯具不投影（透明排序与"光源自身"观感都会出问题），其余实体统一投影/接收。
    obj.castShadow =
      ENABLE_GALLERY_RUNTIME_SHADOWS &&
      !isTempBlocker &&
      !obj.name.startsWith("GLASS_") &&
      !isGalleryLightMesh(obj.name);
    // 透明玻璃/发光体也不接收阴影：透明面上印影子会像影子飘在玻璃前面。
    obj.receiveShadow =
      ENABLE_GALLERY_RUNTIME_SHADOWS &&
      !isTempBlocker &&
      !obj.name.startsWith("GLASS_") &&
      !isGalleryLightMesh(obj.name);

    if (isGalleryLightMesh(obj.name)) {
      obj.getWorldPosition(worldPosition);
      lightHalos.push({
        name: obj.name,
        position: [worldPosition.x, worldPosition.y, worldPosition.z],
      });
    }

    if (obj.name.startsWith("bulb_")) {
      obj.getWorldPosition(worldPosition);
      bulbs.push({
        name: obj.name,
        position: [worldPosition.x, worldPosition.y, worldPosition.z],
      });
    }
  });

  if (ENABLE_GALLERY_INK_OUTLINES) {
    addGalleryInkOutline(root, inkSources);
  }

  if (!assignedTempBlockerMaterial) tempBlockerMaterial.dispose();

  return { bulbs, lightHalos };
}
