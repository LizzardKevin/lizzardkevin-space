import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { GALLERY_GLB_URL, GLTF_DRACO_DECODER_PATH } from "../src/scenes/gallery/galleryConfig";
import { prepareGalleryScene } from "../src/scenes/gallery/prepareGalleryScene";
import { buildSpaceMinimapModel } from "../src/space/minimap/minimapModel";

/**
 * 由 scripts/generate-space-minimap-glb.mjs 在 headless Chrome 里经 vite 加载执行:
 * 跑与运行时完全相同的剥离管线(prepareGalleryScene 可见性/去重 + buildSpaceMinimapModel
 * 前缀过滤/分层合并),把结果导出为世界坐标 GLB。只在工具链中使用,不进应用 bundle。
 */
export async function buildSpaceMinimapGlbBase64(): Promise<string> {
  const draco = new DRACOLoader().setDecoderPath(GLTF_DRACO_DECODER_PATH);
  const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(GALLERY_GLB_URL);
  prepareGalleryScene(gltf.scene);

  const model = buildSpaceMinimapModel(gltf.scene);
  if (!model) throw new Error("strip build produced no geometry");

  const exportScene = new THREE.Scene();
  exportScene.name = "space_minimap_strip";
  let totalVertices = 0;
  const addMesh = (name: string, geometry: THREE.BufferGeometry) => {
    const mesh = new THREE.Mesh(geometry);
    mesh.name = name;
    totalVertices += (geometry.getAttribute("position") as THREE.BufferAttribute).count;
    exportScene.add(mesh);
  };

  // 步行面逐块导出(站立检测/点亮需要逐块网格);墙体合并导出。
  for (const piece of model.floorPieces) {
    addMesh(`MAP_${piece.kind === "stair" ? "STAIR" : "FLOOR"}_${piece.name}`, piece.geometry);
  }
  if (model.wallGeometry) addMesh("MAP_WALL_STRIP", model.wallGeometry);
  if (model.otherGeometry) addMesh("MAP_OTHER_STRIP", model.otherGeometry);

  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(exportScene, { binary: true });
  const bytes = new Uint8Array(result as ArrayBuffer);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary) + `|vertices=${totalVertices}`;
}
