import * as THREE from "three";

function materialStaysOutOfShadowPass(material: THREE.Material): boolean {
  const standard = material as THREE.MeshStandardMaterial;
  const physical = material as THREE.MeshPhysicalMaterial;
  const emissive = standard.emissive;

  return (
    material.transparent ||
    material.opacity < 1 ||
    (physical.isMeshPhysicalMaterial && physical.transmission > 0) ||
    (emissive instanceof THREE.Color && standard.emissiveIntensity > 0 && emissive.getHex() !== 0)
  );
}

/** Opaque exhibit meshes join the full-profile static key-light shadow pass. */
export function configureSceneExhibitShadows(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const participates = mesh.visible && !materials.some(materialStaysOutOfShadowPass);
    mesh.castShadow = participates;
    mesh.receiveShadow = participates;
  });
}
