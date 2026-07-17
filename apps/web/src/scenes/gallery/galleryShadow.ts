import * as THREE from "three";
import { GALLERY_SHADOW } from "./galleryConfig.ts";

/** Name of the SpaceSession key light so the gallery can fit its shadow camera without prop drilling. */
export const GALLERY_KEY_LIGHT_NAME = "space_gallery_key_light";

/**
 * Fit a directional light's orthographic shadow camera to the gallery bounds in
 * LIGHT SPACE: project the 8 bounds corners into the light's view frame and hug
 * their min/max. The light keeps its authored direction and is pushed out along
 * it. Tight per-axis coverage + short depth range = denser texels and no acne.
 */
export function fitDirectionalShadowCamera(
  light: THREE.DirectionalLight,
  bounds: THREE.Box3,
  margin = GALLERY_SHADOW.margin,
): void {
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = size.length() / 2;

  const direction = light.position.clone().sub(light.target.position);
  if (direction.lengthSq() === 0) direction.set(1, 1, 1);
  direction.normalize();

  light.target.position.copy(center);
  light.position.copy(center.clone().add(direction.multiplyScalar(radius * 2 + margin)));
  light.target.updateMatrixWorld();

  const rotation = new THREE.Matrix4().lookAt(light.position, light.target.position, new THREE.Vector3(0, 1, 0));
  const lightWorld = new THREE.Matrix4()
    .makeTranslation(light.position.x, light.position.y, light.position.z)
    .multiply(rotation);
  const view = lightWorld.invert();

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  const corner = new THREE.Vector3();
  for (let i = 0; i < 8; i++) {
    corner.set(
      i & 1 ? bounds.max.x : bounds.min.x,
      i & 2 ? bounds.max.y : bounds.min.y,
      i & 4 ? bounds.max.z : bounds.min.z,
    ).applyMatrix4(view);
    minX = Math.min(minX, corner.x);
    maxX = Math.max(maxX, corner.x);
    minY = Math.min(minY, corner.y);
    maxY = Math.max(maxY, corner.y);
    minZ = Math.min(minZ, corner.z);
    maxZ = Math.max(maxZ, corner.z);
  }

  const camera = light.shadow.camera;
  camera.left = minX - margin;
  camera.right = maxX + margin;
  camera.top = maxY + margin;
  camera.bottom = minY - margin;
  camera.near = Math.max(0.1, -maxZ - margin);
  camera.far = -minZ + margin;
  camera.updateProjectionMatrix();
}

/**
 * Static-scene shadow policy: the map re-renders only when something asks for it.
 * Call after exhibit LOD mounts/unmounts so their silhouettes join the pass once.
 */
export function refreshStaticShadowMap(renderer: {
  shadowMap?: { autoUpdate: boolean; needsUpdate: boolean };
}): void {
  const shadowMap = renderer.shadowMap;
  if (shadowMap && !shadowMap.autoUpdate) shadowMap.needsUpdate = true;
}
