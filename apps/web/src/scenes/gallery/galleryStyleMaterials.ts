import * as THREE from "three";
import { GALLERY_ALUMINUM_MATERIAL, GALLERY_LIGHT_EMISSIVE, GALLERY_TOON } from "./galleryConfig.ts";
import { getGalleryToonGradientMap } from "./galleryToonMaterial.ts";

type GalleryMaterialStyleAction = "preserve" | "stylize";

const STYLIZED_PREFIXES = [
  "ARCH_",
  "PLASTER_",
  "STRUCT_WALL_",
  "STRUCT_CEILING_",
  "STRUCT_FLOOR_",
  "ARCH_FLOOR_",
  "STRUCT_STAIR_",
  "ARCH_STAIR_",
];

const PRESERVED_PREFIXES = [
  "ANCHOR_",
  "COL_",
  "EXHIBITS_",
  "GLASS_",
  "LIGHT_GENERIC_LIGHT_",
  "METAL_ALUMINUM_",
  "bulb_",
  "spawn_",
];

type MaterialWithColor = THREE.Material & { color: THREE.Color };
type MaterialWithEmissive = THREE.Material & {
  emissive: THREE.Color;
  emissiveIntensity: number;
};

function startsWithAny(name: string, prefixes: string[]) {
  return prefixes.some((prefix) => name.startsWith(prefix));
}

function hasColor(material: THREE.Material): material is MaterialWithColor {
  return (material as { color?: unknown }).color instanceof THREE.Color;
}

function hasEmissive(material: THREE.Material): material is MaterialWithEmissive {
  return (material as { emissive?: unknown }).emissive instanceof THREE.Color;
}

function neutralizeColor(color: THREE.Color) {
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  color.setHSL(0, 0, hsl.l);
}

export function shouldPreserveGalleryMaterial(name: string) {
  return startsWithAny(name, PRESERVED_PREFIXES);
}

export function isGalleryLightMesh(name: string) {
  return name.startsWith("bulb_") || name.startsWith("LIGHT_GENERIC_LIGHT_");
}

export function shouldStylizeGalleryMaterial(name: string) {
  return !shouldPreserveGalleryMaterial(name) && startsWithAny(name, STYLIZED_PREFIXES);
}

export function getGalleryMaterialStyleAction(name: string): GalleryMaterialStyleAction {
  return shouldStylizeGalleryMaterial(name) ? "stylize" : "preserve";
}

function colorForGalleryMesh(name: string) {
  if (name.startsWith("ARCH_FLOOR_") || name.startsWith("STRUCT_FLOOR_")) {
    return GALLERY_TOON.stylizedMaterials.floor;
  }
  if (name.startsWith("ARCH_STAIR_") || name.startsWith("STRUCT_STAIR_")) {
    return GALLERY_TOON.stylizedMaterials.stair;
  }
  if (name.startsWith("STRUCT_WALL_") || name.startsWith("PLASTER_") || name.includes("_PLASTER_")) {
    return GALLERY_TOON.stylizedMaterials.wall;
  }
  if (name.startsWith("STRUCT_CEILING_") || name.startsWith("ARCH_CEILING_")) {
    return GALLERY_TOON.stylizedMaterials.ceiling;
  }
  return GALLERY_TOON.stylizedMaterials.architecture;
}

const stylizedMaterialCache = new Map<string, THREE.MeshToonMaterial>();

export function getGalleryStylizedMaterial(meshName: string) {
  const color = colorForGalleryMesh(meshName);
  const cached = stylizedMaterialCache.get(color);
  if (cached) return cached;

  const material = new THREE.MeshToonMaterial({
    color,
    gradientMap: getGalleryToonGradientMap(),
  });
  material.name = `space_stylized_${color.slice(1)}`;
  stylizedMaterialCache.set(color, material);
  return material;
}

export function applyGalleryStylizedMaterial(mesh: THREE.Mesh) {
  if (getGalleryMaterialStyleAction(mesh.name) !== "stylize") return false;
  mesh.material = getGalleryStylizedMaterial(mesh.name);
  return true;
}

function neutralizeMaterial(material: THREE.Material) {
  let changed = false;
  if (hasColor(material)) {
    neutralizeColor(material.color);
    changed = true;
  }
  if (hasEmissive(material)) {
    neutralizeColor(material.emissive);
    changed = true;
  }
  if (changed) material.needsUpdate = true;
  return changed;
}

function applyGalleryAluminumMaterial(material: THREE.Material) {
  let changed = false;
  if (hasColor(material)) {
    material.color.set(GALLERY_ALUMINUM_MATERIAL.color);
    changed = true;
  }
  if (hasEmissive(material)) {
    material.emissive.set(GALLERY_ALUMINUM_MATERIAL.emissive);
    material.emissiveIntensity = 0;
    changed = true;
  }

  const standard = material as THREE.MeshStandardMaterial;
  if (standard.isMeshStandardMaterial || (standard as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial) {
    standard.metalness = GALLERY_ALUMINUM_MATERIAL.metalness;
    standard.roughness = GALLERY_ALUMINUM_MATERIAL.roughness;
    standard.envMapIntensity = GALLERY_ALUMINUM_MATERIAL.envMapIntensity;
    changed = true;
  }

  if (changed) material.needsUpdate = true;
  return changed;
}

function toGalleryLightMaterial(source: THREE.Material) {
  if (hasEmissive(source)) {
    const material = source.clone() as THREE.MeshStandardMaterial;
    if (hasColor(material)) material.color.set(GALLERY_LIGHT_EMISSIVE.surfaceColor);
    material.emissive.set(GALLERY_LIGHT_EMISSIVE.color);
    material.emissiveIntensity = GALLERY_LIGHT_EMISSIVE.intensity;
    material.toneMapped = false;
    material.needsUpdate = true;
    return material;
  }

  const material = new THREE.MeshStandardMaterial({
    color: GALLERY_LIGHT_EMISSIVE.surfaceColor,
    emissive: GALLERY_LIGHT_EMISSIVE.color,
    emissiveIntensity: GALLERY_LIGHT_EMISSIVE.intensity,
    metalness: 0,
    roughness: 0.35,
    opacity: source.opacity,
    transparent: source.transparent,
    side: source.side,
    depthWrite: source.depthWrite,
  });
  material.name = `${source.name || "gallery_light"}_emissive`;
  material.toneMapped = false;
  return material;
}

function applyGalleryLightMaterial(mesh: THREE.Mesh) {
  mesh.material = Array.isArray(mesh.material)
    ? mesh.material.map((material) => toGalleryLightMaterial(material))
    : toGalleryLightMaterial(mesh.material);
  return true;
}

export function applyGalleryNeutralMaterialTone(mesh: THREE.Mesh) {
  if (mesh.name.startsWith("METAL_ALUMINUM_")) {
    if (Array.isArray(mesh.material)) {
      return mesh.material.some((material) => applyGalleryAluminumMaterial(material));
    }
    return applyGalleryAluminumMaterial(mesh.material);
  }

  if (Array.isArray(mesh.material)) {
    return mesh.material.some((material) => neutralizeMaterial(material));
  }
  return neutralizeMaterial(mesh.material);
}

export function applyGallerySceneMaterialStyle(mesh: THREE.Mesh) {
  if (isGalleryLightMesh(mesh.name)) return applyGalleryLightMaterial(mesh);
  if (getGalleryMaterialStyleAction(mesh.name) === "stylize") return applyGalleryStylizedMaterial(mesh);
  return applyGalleryNeutralMaterialTone(mesh);
}

export function applyGalleryLightEmissiveIntensity(root: THREE.Object3D, intensity: number) {
  root.traverse((object) => {
    if (!(object as THREE.Mesh).isMesh || !isGalleryLightMesh(object.name)) return;
    const mesh = object as THREE.Mesh;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (!hasEmissive(material)) return;
      material.emissive.set(GALLERY_LIGHT_EMISSIVE.color);
      material.emissiveIntensity = intensity;
      material.toneMapped = false;
      material.needsUpdate = true;
    });
  });
}
