import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  createInkShellGeometry,
  GALLERY_INK_OUTLINE_EXCLUDED_PREFIXES,
  type GalleryInkShellSource,
} from "../../scenes/gallery/galleryInkOutline.ts";
import { GALLERY_INK } from "../../scenes/gallery/galleryConfig.ts";
import { getGalleryMaterialStyleAction } from "../../scenes/gallery/galleryStyleMaterials.ts";

/**
 * SPACE 全息小地图的模型构建:从已加载的 space_main 场景剥离建筑壳,
 * 合并成单一份世界空间几何体,套用全息 toon 材质;墨线壳复用主场景规则。
 * 只读源场景(不改材质/可见性),产物由调用方持有并负责 dispose。
 */

/** 进入全息模型的命名前缀:建筑壳 + 金属构件 + 玻璃(天窗可读性)。 */
export const SPACE_MINIMAP_INCLUDE_PREFIXES = [
  "ARCH_",
  "PLASTER_",
  "STRUCT_",
  "METAL_ALUMINUM_",
  "GLASS_",
] as const;

/** 地图缩尺下主场景的 0.035m 墨线偏细,加粗以保持“粗线条”读感。 */
export const SPACE_MINIMAP_INK_WIDTH = 0.08;

export type SpaceMinimapModel = {
  holoGeometry: THREE.BufferGeometry;
  inkGeometry: THREE.BufferGeometry | null;
  center: THREE.Vector3;
  radius: number;
};

function matchesSpaceMinimapPrefix(name: string) {
  return SPACE_MINIMAP_INCLUDE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export function collectSpaceMinimapSources(root: THREE.Object3D): {
  holo: GalleryInkShellSource[];
  ink: GalleryInkShellSource[];
} {
  root.updateWorldMatrix(true, true);
  const holo: GalleryInkShellSource[] = [];
  const ink: GalleryInkShellSource[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    if (!matchesSpaceMinimapPrefix(mesh.name)) return;
    const source: GalleryInkShellSource = { geometry: mesh.geometry, matrixWorld: mesh.matrixWorld };
    holo.push(source);
    if (
      getGalleryMaterialStyleAction(mesh.name) === "stylize" &&
      !GALLERY_INK_OUTLINE_EXCLUDED_PREFIXES.some((prefix) => mesh.name.startsWith(prefix)) &&
      !GALLERY_INK.exemptPatterns.some((pattern) => pattern.test(mesh.name))
    ) {
      ink.push(source);
    }
  });
  return { holo, ink };
}

/**
 * 世界空间最小几何体(仅 position + index)。mergeGeometries 要求索引形态一致,
 * 非索引几何补顺序索引,避免混入后合并返回 null。
 */
function toSpaceMinimapWorldGeometry({ geometry, matrixWorld }: GalleryInkShellSource) {
  const minimal = new THREE.BufferGeometry();
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  minimal.setAttribute("position", position.clone());
  const index = geometry.getIndex();
  if (index) {
    minimal.setIndex(index.clone());
  } else {
    const sequential = new Uint32Array(position.count);
    for (let i = 0; i < position.count; i++) sequential[i] = i;
    minimal.setIndex(new THREE.BufferAttribute(sequential, 1));
  }
  minimal.applyMatrix4(matrixWorld);
  return minimal;
}

/** 源场景是 useGLTF 缓存的已准备实例(COL_/重复面已隐藏),这里只收集可见建筑。 */
export function buildSpaceMinimapModel(root: THREE.Object3D): SpaceMinimapModel | null {
  const { holo, ink } = collectSpaceMinimapSources(root);
  if (holo.length === 0) return null;

  const parts = holo.map(toSpaceMinimapWorldGeometry);
  const holoGeometry = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!holoGeometry) return null;

  // toon 材质需要 normal;GLB 建筑面在硬边处顶点本来就是分裂的,
  // 这里重建法线后墙面仍保持硬边,只有真共享顶点才会被平滑。
  holoGeometry.computeVertexNormals();

  const inkGeometry = createInkShellGeometry(ink, SPACE_MINIMAP_INK_WIDTH);

  holoGeometry.computeBoundingSphere();
  const boundingSphere = holoGeometry.boundingSphere;
  if (!boundingSphere) {
    holoGeometry.dispose();
    inkGeometry?.dispose();
    return null;
  }

  return {
    holoGeometry,
    inkGeometry,
    center: boundingSphere.center.clone(),
    radius: boundingSphere.radius,
  };
}
