import type * as THREE from "three";

function isMesh(obj: THREE.Object3D): obj is THREE.Mesh {
  return !!obj && (obj as THREE.Mesh).isMesh === true;
}

const EXHIBIT_PREFIX = "exhibit_";

/** Map mesh names like `exhibit_demo_box` → userData.exhibitId = `demo_box`. */
export function bindExhibitIds(root: THREE.Object3D) {
  root.traverse((obj) => {
    if (!isMesh(obj)) return;
    if (!obj.name.startsWith(EXHIBIT_PREFIX)) return;
    const id = obj.name.slice(EXHIBIT_PREFIX.length);
    if (id) obj.userData.exhibitId = id;
  });
}
