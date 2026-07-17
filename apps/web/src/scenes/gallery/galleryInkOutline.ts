import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { GALLERY_INK } from "./galleryConfig.ts";

export const SPACE_INK_OUTLINE_NAME = "SPACE_INK_OUTLINE";

export const EXHIBIT_INK_OUTLINE_SUFFIX = "__SPACE_INK_OUTLINE";

/** Walkable surfaces stay outline-free: floor/stair shells read as noise underfoot. */
export const GALLERY_INK_OUTLINE_EXCLUDED_PREFIXES = [
  "STRUCT_FLOOR_",
  "ARCH_FLOOR_",
  "STRUCT_STAIR_",
  "ARCH_STAIR_",
];

export type GalleryInkShellSource = {
  geometry: THREE.BufferGeometry;
  matrixWorld: THREE.Matrix4;
};

let sharedInkMaterial: THREE.MeshBasicMaterial | null = null;
const exhibitInkTemplateCache = new WeakMap<THREE.Object3D, THREE.BufferGeometry | null>();

/** One shared ink material for every shell: flat ink, tone-map independent, back faces only. */
export function getGalleryInkOutlineMaterial(): THREE.MeshBasicMaterial {
  if (!sharedInkMaterial) {
    sharedInkMaterial = new THREE.MeshBasicMaterial({
      color: GALLERY_INK.color,
      toneMapped: false,
      side: THREE.BackSide,
      // Depth bias: hull fragments that only marginally poke through a flush
      // neighbor surface lose the depth test instead of showing as stray ink.
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    sharedInkMaterial.name = "space_ink_outline";
  }
  return sharedInkMaterial;
}

/**
 * World-space inverted-hull shell for one source mesh: positions only, welded,
 * smooth normals, then extruded outward by `width` meters.
 */
function createWorldSpaceShell({ geometry, matrixWorld }: GalleryInkShellSource, width: number) {
  const minimal = new THREE.BufferGeometry();
  minimal.setAttribute("position", (geometry.getAttribute("position") as THREE.BufferAttribute).clone());
  const index = geometry.getIndex();
  if (index) minimal.setIndex(index.clone());
  minimal.applyMatrix4(matrixWorld);

  // Welding first so hard edges share vertices and get averaged smooth normals;
  // extruding along those keeps the shell closed at corners.
  const welded = mergeVertices(minimal);
  minimal.dispose();
  welded.computeVertexNormals();

  const position = welded.getAttribute("position") as THREE.BufferAttribute;
  const normal = welded.getAttribute("normal") as THREE.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    position.setXYZ(
      i,
      position.getX(i) + normal.getX(i) * width,
      position.getY(i) + normal.getY(i) * width,
      position.getZ(i) + normal.getZ(i) * width,
    );
  }
  welded.deleteAttribute("normal");
  return welded;
}

/**
 * Build one merged shell geometry for many source meshes (single draw call with
 * the shared ink material). Returns null when there is nothing to outline.
 */
export function createInkShellGeometry(
  sources: GalleryInkShellSource[],
  width: number,
): THREE.BufferGeometry | null {
  if (sources.length === 0) return null;

  const shells = sources.map((source) => createWorldSpaceShell(source, width));
  if (shells.length === 1) return shells[0];

  const merged = mergeGeometries(shells, false);
  shells.forEach((shell) => shell.dispose());
  return merged;
}

/**
 * Attach (or replace) the merged ink shell under `root`. Idempotent so repeated
 * scene preparation never stacks duplicate shells.
 */
export function addGalleryInkOutline(root: THREE.Object3D, sources: GalleryInkShellSource[]): THREE.Mesh | null {
  const previous = root.getObjectByName(SPACE_INK_OUTLINE_NAME) as THREE.Mesh | undefined;
  if (previous) {
    root.remove(previous);
    previous.geometry.dispose();
  }
  if (sources.length === 0) return null;

  const geometry = createInkShellGeometry(sources, GALLERY_INK.width);
  if (!geometry) return null;

  const shell = new THREE.Mesh(geometry, getGalleryInkOutlineMaterial());
  shell.name = SPACE_INK_OUTLINE_NAME;
  shell.castShadow = false;
  shell.receiveShadow = false;
  shell.raycast = () => null;
  root.add(shell);
  return shell;
}

/**
 * Per-exhibit ink shell in the exhibit's OWN local space, added as a child so it
 * follows the exhibit transform and unmounts with the distance LOD. Never merged
 * across exhibits. Requires root.updateMatrixWorld(true) beforehand.
 */
export function getExhibitInkOutlineTemplate(
  source: THREE.Object3D,
  preparedRoot: THREE.Object3D,
): THREE.BufferGeometry | null {
  if (exhibitInkTemplateCache.has(source)) {
    return exhibitInkTemplateCache.get(source) ?? null;
  }

  const inverseRoot = preparedRoot.matrixWorld.clone().invert();
  const sources: GalleryInkShellSource[] = [];
  preparedRoot.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    sources.push({
      geometry: mesh.geometry,
      matrixWorld: inverseRoot.clone().multiply(mesh.matrixWorld),
    });
  });

  // The template is never rendered, so it owns CPU attributes only. WeakMap
  // lifetime follows useGLTF's source scene; mounted clones keep normal dispose.
  const template = createInkShellGeometry(sources, GALLERY_INK.width);
  exhibitInkTemplateCache.set(source, template);
  return template;
}

export function addExhibitInkOutline(
  root: THREE.Object3D,
  source: THREE.Object3D = root,
): THREE.Mesh | null {
  disposeExhibitInkOutline(root);

  const template = getExhibitInkOutlineTemplate(source, root);
  if (!template) return null;
  const geometry = template.clone();

  const shell = new THREE.Mesh(geometry, getGalleryInkOutlineMaterial());
  shell.name = `${root.name || "exhibit"}${EXHIBIT_INK_OUTLINE_SUFFIX}`;
  shell.castShadow = false;
  shell.receiveShadow = false;
  shell.raycast = () => null;
  root.add(shell);
  root.userData[EXHIBIT_INK_OUTLINE_SUFFIX] = shell;
  return shell;
}

/** Remove and dispose an exhibit shell previously attached by addExhibitInkOutline. */
export function disposeExhibitInkOutline(root: THREE.Object3D): void {
  const shell = root.userData[EXHIBIT_INK_OUTLINE_SUFFIX] as THREE.Mesh | undefined;
  if (!shell) return;
  shell.removeFromParent();
  shell.geometry.dispose();
  delete root.userData[EXHIBIT_INK_OUTLINE_SUFFIX];
}
