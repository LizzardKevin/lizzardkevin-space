import * as THREE from "three";

export const TREE_HABITAT_WHITE_MATTE_MATERIAL_NAME = "mat_treehabitat_white_matte";
export const TREE_HABITAT_GLASS_FROSTED_MATERIAL_NAME = "mat_treehabitat_glass_frosted";

const TREE_HABITAT_SHARED_EXHIBIT_IDS = new Set([
  "arch_uabb_exhibit",
  "arch_3d_printing_architecture",
]);
const GLASS_NAME_PATTERN = /\b(glass|window|glazing|pane|transparent|translucent)\b/i;

type TreeHabitatSharedMaterialKind = "white" | "glass";

function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return (object as THREE.Mesh).isMesh === true;
}

function materialNames(material: THREE.Material | THREE.Material[]): string[] {
  if (Array.isArray(material)) return material.map((entry) => entry.name);
  return [material.name];
}

export function usesTreeHabitatSharedMaterials(exhibitId: string) {
  return TREE_HABITAT_SHARED_EXHIBIT_IDS.has(exhibitId);
}

export function resolveTreeHabitatSharedMaterialKind(
  meshName: string,
  sourceMaterialNames: string[],
): TreeHabitatSharedMaterialKind {
  const text = [meshName, ...sourceMaterialNames].join(" ").replace(/[\W_]+/g, " ");
  return GLASS_NAME_PATTERN.test(text) ? "glass" : "white";
}

export function createTreeHabitatSharedMaterials() {
  const white = new THREE.MeshStandardMaterial({
    name: TREE_HABITAT_WHITE_MATTE_MATERIAL_NAME,
    color: new THREE.Color(0.96, 0.96, 0.94),
    metalness: 0,
    roughness: 0.82,
  });

  const glass = new THREE.MeshPhysicalMaterial({
    name: TREE_HABITAT_GLASS_FROSTED_MATERIAL_NAME,
    color: new THREE.Color(0.68, 0.7, 0.7),
    metalness: 0,
    roughness: 0.68,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  return { white, glass };
}

export function applyTreeHabitatSharedMaterials(root: THREE.Object3D, exhibitId: string) {
  if (!usesTreeHabitatSharedMaterials(exhibitId)) return false;

  const materials = createTreeHabitatSharedMaterials();
  root.traverse((object) => {
    if (!isMesh(object)) return;
    const kind = resolveTreeHabitatSharedMaterialKind(object.name, materialNames(object.material));
    object.material = materials[kind];
  });
  return true;
}
