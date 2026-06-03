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

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) material.forEach((m) => m.dispose());
  else material.dispose();
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

    if (ENABLE_GALLERY_OVERRIDE_MATERIALS) {
      applyGallerySurfaceMaterial(obj, GALLERY_SURFACE_COLOR);
    }

    obj.castShadow = ENABLE_GALLERY_RUNTIME_SHADOWS;
    obj.receiveShadow = ENABLE_GALLERY_RUNTIME_SHADOWS;

    if (obj.name.startsWith("bulb_")) {
      bulbs.push({
        name: obj.name,
        position: [obj.position.x, obj.position.y, obj.position.z],
      });
    }
  });

  return { bulbs };
}
