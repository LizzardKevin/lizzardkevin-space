import * as THREE from "three";
import { GALLERY_TOON } from "./galleryConfig";

let gradientMap: THREE.DataTexture | null = null;
let cachedGradientRevision = -1;
const GRADIENT_WIDTH = 64;

/**
 * 1D cel band lookup for MeshToonMaterial (Firewatch-style stepped shading).
 * Reused across all gallery surfaces.
 */
export function getGalleryToonGradientMap(): THREE.DataTexture {
  if (gradientMap && cachedGradientRevision === GALLERY_TOON.gradientRevision) {
    return gradientMap;
  }

  if (gradientMap) {
    gradientMap.dispose();
    gradientMap = null;
  }

  cachedGradientRevision = GALLERY_TOON.gradientRevision;

  const { shadow, mid, light, highlight } = GALLERY_TOON.gradientStops;
  // WebGPU 不支持 RGBFormat；使用 RGBAFormat（每个 texel 补 alpha=255）。
  // 另外使用更高分辨率的 1D 查表，减少阈值跳变导致的“随视角抖动/闪烁”观感。
  const data = new Uint8Array(GRADIENT_WIDTH * 4);
  const c0 = new THREE.Color(shadow);
  const c1 = new THREE.Color(mid);
  const c2 = new THREE.Color(light);
  const c3 = new THREE.Color(highlight);

  for (let i = 0; i < GRADIENT_WIDTH; i++) {
    const t = i / (GRADIENT_WIDTH - 1);
    const c = sample4StopGradient(t, c0, c1, c2, c3);
    const idx = i * 4;
    data[idx + 0] = Math.round(c.r * 255);
    data[idx + 1] = Math.round(c.g * 255);
    data[idx + 2] = Math.round(c.b * 255);
    data[idx + 3] = 255;
  }

  gradientMap = new THREE.DataTexture(data, GRADIENT_WIDTH, 1, THREE.RGBAFormat);
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.wrapS = THREE.ClampToEdgeWrapping;
  gradientMap.wrapT = THREE.ClampToEdgeWrapping;
  // gradientMap 是 toon 查表纹理：不应做 sRGB/线性转换，也不需要 mipmaps。
  // WebGPU 下错误的 colorSpace/mipmaps 可能导致随视角变化的颜色伪影/闪烁。
  gradientMap.colorSpace = THREE.NoColorSpace;
  gradientMap.generateMipmaps = false;
  gradientMap.needsUpdate = true;
  return gradientMap;
}

function sample4StopGradient(t: number, c0: THREE.Color, c1: THREE.Color, c2: THREE.Color, c3: THREE.Color): THREE.Color {
  if (t <= 0) return c0;
  if (t >= 1) return c3;
  const seg = t * 3;
  const i = Math.floor(seg);
  const f = seg - i;
  const out = new THREE.Color();
  if (i === 0) return out.copy(c0).lerp(c1, f);
  if (i === 1) return out.copy(c1).lerp(c2, f);
  return out.copy(c2).lerp(c3, f);
}

export function createGalleryToonMaterial(color: string): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({
    color,
    gradientMap: getGalleryToonGradientMap(),
  });
}
