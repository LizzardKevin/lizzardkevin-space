import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  createInkShellGeometry,
  GALLERY_INK_OUTLINE_EXCLUDED_PREFIXES,
  type GalleryInkShellSource,
} from "../../scenes/gallery/galleryInkOutline.ts";
import { GALLERY_INK } from "../../scenes/gallery/galleryConfig.ts";
import { getGalleryMaterialStyleAction } from "../../scenes/gallery/galleryStyleMaterials.ts";
import { publicAssetUrl } from "../../platform/publicAssets.ts";

/**
 * SPACE 全息小地图的模型与坐标。
 * 显示模型 = 独立的减面 GLB(space_hologram_map.glb,自身局部坐标、贴地归一);
 * 玩家点映射 = 主场景建筑包围盒 → 地图包围盒的均匀缩放+平移(minimapWorldMapper)。
 * 只读源场景,产物由调用方持有并负责 dispose。
 */

/** Bump when replacing space_hologram_map.glb so dev/browser reloads geometry. */
export const SPACE_HOLOGRAM_GLB_REVISION = "20260806-holo1";
export const SPACE_HOLOGRAM_GLB_URL = publicAssetUrl(
  `/models/space_hologram_map.glb?v=${SPACE_HOLOGRAM_GLB_REVISION}`,
);

/** 主场景里参与“建筑包围盒”估计的命名前缀(与全息 GLB 的体块口径一致)。 */
export const SPACE_MINIMAP_INCLUDE_PREFIXES = [
  "ARCH_",
  "PLASTER_",
  "STRUCT_",
  "METAL_ALUMINUM_",
  "GLASS_",
] as const;

/** 墨线宽度(地图局部坐标;全息 GLB 与主场景同尺度,沿用主场景读感加粗值)。 */
export const SPACE_MINIMAP_INK_WIDTH = 0.08;

/** 地图分层:楼板/楼梯(含步行面)与墙/天花给不同透明度,制造“层层叠叠”的体积读感。 */
export type SpaceMinimapLayer = "floor" | "wall" | "other";

export function resolveSpaceMinimapLayer(name: string): SpaceMinimapLayer {
  if (name.startsWith("MAP_FLOOR_") || name.startsWith("MAP_STAIR_")) return "floor";
  if (name.startsWith("MAP_WALL_")) return "wall";
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

export type SpaceMinimapSource = GalleryInkShellSource & { name: string };

function matchesSpaceMinimapPrefix(name: string) {
  return SPACE_MINIMAP_INCLUDE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

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

function mergeSpaceMinimapLayer(sources: SpaceMinimapSource[]) {
  if (sources.length === 0) return null;
  const parts = sources.map(toSpaceMinimapWorldGeometry);
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  return merged;
}

/** 全息 GLB → 分层合并模型。GLB 已是纯建筑壳,不再按前缀过滤,只按名字分层。 */
export function buildSpaceHologramModel(root: THREE.Object3D): SpaceMinimapModel | null {
  root.updateWorldMatrix(true, true);
  const byLayer: Record<SpaceMinimapLayer, SpaceMinimapSource[]> = {
    floor: [],
    wall: [],
    other: [],
  };
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    byLayer[resolveSpaceMinimapLayer(mesh.name)].push({
      name: mesh.name,
      geometry: mesh.geometry,
      matrixWorld: mesh.matrixWorld,
    });
  });

  const layers: Partial<Record<SpaceMinimapLayer, THREE.BufferGeometry | null>> = {};
  const bounds = new THREE.Box3();
  let kept = 0;
  for (const layer of ["floor", "wall", "other"] as const) {
    const merged = mergeSpaceMinimapLayer(byLayer[layer]);
    if (!merged) {
      layers[layer] = null;
      continue;
    }
    // 纯白 basic 全息不需要法线;减面模型的“层层叠叠”靠分层透明度,不靠光照。
    merged.deleteAttribute("normal");
    merged.computeBoundingBox();
    bounds.union(merged.boundingBox!);
    layers[layer] = merged;
    kept += 1;
  }
  if (kept === 0) return null;

  const allSources = [...byLayer.floor, ...byLayer.wall, ...byLayer.other];
  const inkGeometry = createInkShellGeometry(allSources, SPACE_MINIMAP_INK_WIDTH);

  const sphere = new THREE.Sphere();
  bounds.getBoundingSphere(sphere);
  return {
    layers: layers as Record<SpaceMinimapLayer, THREE.BufferGeometry | null>,
    inkGeometry,
    center: sphere.center.clone(),
    radius: sphere.radius,
  };
}

/** 主场景建筑壳的世界包围盒:只读几何 bbox,不复制顶点。 */
export function computeSpaceArchitectureBounds(root: THREE.Object3D): THREE.Box3 | null {
  const { holo } = collectSpaceMinimapSources(root);
  if (holo.length === 0) return null;
  const bounds = new THREE.Box3();
  const meshBounds = new THREE.Box3();
  for (const source of holo) {
    source.geometry.computeBoundingBox();
    if (!source.geometry.boundingBox) continue;
    meshBounds.copy(source.geometry.boundingBox).applyMatrix4(source.matrixWorld);
    bounds.union(meshBounds);
  }
  return bounds.isEmpty() ? null : bounds;
}

export type SpaceMinimapWorldMapper = (
  worldPos: readonly [number, number, number],
) => [number, number, number];

/** 主场景世界坐标 → 全息 GLB 局部坐标:包围球中心对齐 + 半径均匀缩放。 */
export function createSpaceMinimapWorldMapper(
  worldBounds: THREE.Box3,
  mapCenter: THREE.Vector3,
  mapRadius: number,
): SpaceMinimapWorldMapper {
  const worldSphere = new THREE.Sphere();
  worldBounds.getBoundingSphere(worldSphere);
  const scale = mapRadius / Math.max(worldSphere.radius, 0.001);
  const worldCenter = worldSphere.center;
  return (worldPos) => [
    (worldPos[0] - worldCenter.x) * scale + mapCenter.x,
    (worldPos[1] - worldCenter.y) * scale + mapCenter.y,
    (worldPos[2] - worldCenter.z) * scale + mapCenter.z,
  ];
}
