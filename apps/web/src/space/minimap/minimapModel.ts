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

/** 地图分层:楼板/楼梯(含步行面)与墙/天花给不同透明度,制造“层层叠叠”的体积读感。 */
export type SpaceMinimapLayer = "floor" | "wall" | "other";

export function resolveSpaceMinimapLayer(name: string): SpaceMinimapLayer {
  if (/^(?:STRUCT|ARCH)_(?:FLOOR|STAIR)_/.test(name)) return "floor";
  if (name.startsWith("PLASTER_") || name.includes("_WALL_") || name.includes("_CEILING_")) {
    return "wall";
  }
  return "other";
}

export type SpaceMinimapModel = {
  layers: Readonly<Record<SpaceMinimapLayer, THREE.BufferGeometry | null>>;
  inkGeometry: THREE.BufferGeometry | null;
  center: THREE.Vector3;
  radius: number;
};

function matchesSpaceMinimapPrefix(name: string) {
  return SPACE_MINIMAP_INCLUDE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

export type SpaceMinimapSource = GalleryInkShellSource & { name: string };

export function collectSpaceMinimapSources(root: THREE.Object3D): {
  holo: SpaceMinimapSource[];
  ink: SpaceMinimapSource[];
} {
  root.updateWorldMatrix(true, true);
  const holo: SpaceMinimapSource[] = [];
  const ink: SpaceMinimapSource[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    if (!matchesSpaceMinimapPrefix(mesh.name)) return;
    const source: SpaceMinimapSource = {
      name: mesh.name,
      geometry: mesh.geometry,
      matrixWorld: mesh.matrixWorld,
    };
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

  const byLayer: Record<SpaceMinimapLayer, SpaceMinimapSource[]> = {
    floor: [],
    wall: [],
    other: [],
  };
  for (const source of holo) byLayer[resolveSpaceMinimapLayer(source.name)].push(source);

  const layers: Partial<Record<SpaceMinimapLayer, THREE.BufferGeometry | null>> = {};
  const bounds = new THREE.Box3();
  let kept = 0;
  for (const layer of ["floor", "wall", "other"] as const) {
    const sources = byLayer[layer];
    if (sources.length === 0) {
      layers[layer] = null;
      continue;
    }
    const parts = sources.map(toSpaceMinimapWorldGeometry);
    const merged = mergeGeometries(parts, false);
    parts.forEach((part) => part.dispose());
    if (!merged) {
      layers[layer] = null;
      continue;
    }
    // toon 渐变在白色全息上会把暗部压成深灰,材质走纯白 basic,这里无需法线。
    merged.deleteAttribute("normal");
    merged.computeBoundingBox();
    bounds.union(merged.boundingBox!);
    layers[layer] = merged;
    kept += 1;
  }
  if (kept === 0) return null;

  const inkGeometry = createInkShellGeometry(ink, SPACE_MINIMAP_INK_WIDTH);

  const sphere = new THREE.Sphere();
  bounds.getBoundingSphere(sphere);
  return {
    layers: layers as Record<SpaceMinimapLayer, THREE.BufferGeometry | null>,
    inkGeometry,
    center: sphere.center.clone(),
    radius: sphere.radius,
  };
}
