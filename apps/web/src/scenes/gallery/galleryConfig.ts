export const ENABLE_GALLERY_GLB = true;

/** Set true after placing public/media/art_01.jpg (or update GALLERY_WALL_ART.imageUrl). */
export const ENABLE_GALLERY_WALL_ART = false;

/** Fallback spawn before GLB resolves (overwritten once gallery loads). */
export const GALLERY_SPAWN: [number, number, number] = [-0.51, 36.897, -48.318];

/**
 * First desktop view direction from the resolved spawn marker.
 * Blender global -Y exports to Three.js +Z in the Y-up GLB.
 */
export const GALLERY_INITIAL_LOOK_DIRECTION: [number, number, number] = [0, 0, 1];
export const GALLERY_INITIAL_LOOK_DISTANCE = 10;

/** Bump when replacing space_main.glb so dev/browser reloads geometry. */
export const GALLERY_GLB_REVISION = "20260625-treehabitat-noao-0019";

export const GALLERY_GLB_URL = `/models/space_main.glb?v=${GALLERY_GLB_REVISION}`;

/** Local Draco decoder path for compressed GLB files; avoids runtime fetches to gstatic. */
export const GLTF_DRACO_DECODER_PATH = "/draco/";

/** Temporary: spawn outside COL_outer and drop onto the floor. */
export const USE_OUTSIDE_GALLERY_SPAWN = false;

/** Meters above standing height when using outside spawn. */
export const GALLERY_OUTSIDE_SPAWN_DROP = 2;

/** Visible gallery mesh tint — only used when ENABLE_GALLERY_OVERRIDE_MATERIALS is true. */
export const GALLERY_SURFACE_COLOR = "#c0bab0";

/**
 * false = 保留 space_main.glb 内 Blender/glTF 材质（Principled、Emission 等）。
 * true = 加载时整场景替换为统一 toon/纯色（会丢弃导出材质）。
 */
export const ENABLE_GALLERY_OVERRIDE_MATERIALS = false;

/**
 * Neutral space look: soft fog + tuned lights. Mesh material override remains off
 * for production so Blender/glTF PBR materials drive metal, glass, and floor finish.
 * 仅在与 OVERRIDE_MATERIALS 同时为 true 时才会给 mesh 套上 toon；否则只影响雾与灯光。
 */
export const ENABLE_GALLERY_TOON = true;

/** Cel band colors sampled by gradientMap (shadow → highlight). */
export const GALLERY_TOON = {
  background: "#d2d2d2",
  fogColor: "#d2d2d2",
  fogNear: 10,
  fogFar: 32,
  /** Bump when changing gradientStops so dev HMR rebuilds the toon lookup texture. */
  gradientRevision: 3,
  /** Neutral grayscale bands, used only when material override is enabled. */
  gradientStops: {
    shadow: "#4f504d",
    mid: "#7d7d78",
    light: "#b5b4ad",
    highlight: "#e8e8e8",
  },
  ambientIntensity: 0.2,
  hemisphere: { sky: "#dedede", ground: "#505050", intensity: 0.46 },
  keyLight: { position: [-8, 5, 6] as [number, number, number], intensity: 1.1, color: "#f0f0f0" },
  fillLight: { position: [5, 3, -7] as [number, number, number], intensity: 0.32, color: "#8c8c8c" },
  /** Linear Fog vs FogExp2 — exponential gives softer indoor falloff. */
  useExponentialFog: true,
  fogDensity: 0.013,
};

/**
 * Real-time shadow maps from SpacePage lights (NOT baked into the GLB).
 * Set false for flat gallery look after removing Blender sun lights.
 */
export const ENABLE_GALLERY_RUNTIME_SHADOWS = false;

/** Require WebGPURenderer for the 3D gallery (no WebGL post-processing fallback). */
export const ENABLE_GALLERY_WEBGPU = true;

/** Light bloom on bright window edges / highlights (toon + fog path). */
export const ENABLE_GALLERY_BLOOM = true;

export const GALLERY_BLOOM = {
  strength: 0.4,
  radius: 0.35,
  threshold: 0.78,
};

/** Subtle vignette for Firewatch depth/contrast. */
export const ENABLE_GALLERY_VIGNETTE = true;

export const GALLERY_VIGNETTE = {
  /** Darkening strength at the corners. */
  strength: 0.22,
  /** Start radius (0..1). Smaller = vignette starts closer to center. */
  inner: 0.35,
  /** End radius (0..1). Larger = softer falloff to corners. */
  outer: 0.95,
};

/** GLB bulb_* mesh point lights — pale yellow, not orange. */
export const GALLERY_BULB = {
  intensity: 10,
  distance: 9,
  color: "#f3e6c8",
};

/** Exhibit raycast label + hover highlight tuning. */
export const EXHIBIT_TARGET = {
  labelOffsetY: 0.2,
  emissiveColor: "#ffffff",
  emissiveIntensity: 0.06,
  /** Max camera-to-exhibit distance (m) for hover label, highlight, and crosshair feedback. */
  maxDistance: 5,
  /**
   * Html 名牌（transform + sprite）：屏幕大小约 ∝ fontSizePx × distanceFactor（drei 内 scale∝distanceFactor/400）。
   * distanceFactor 越大字越大；近距糊字靠提高 fontSizePx，再用较小 distanceFactor 保持远距大小。
   * 参照：原 5px×8；现 18px×2。
   */
  labelHtml: {
    fontSizePx: 18,
    distanceFactor: 2,
  },
  labelScreenPaddingPx: 32,
};

/** Fallback infinite safety floor Y (center of cuboid). Gallery load may refine this. */
export const GALLERY_SAFETY_GROUND_Y = -10;

/** Procedural wall art — drop image at public/media/art_01.jpg */
export const GALLERY_WALL_ART = {
  imageUrl: "/media/art_01.jpg",
  position: [0, 2, -5.85] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
  maxWidth: 1.2,
  maxHeight: 1.0,
  frameBorder: 0.06,
  frameDepth: 0.04,
};
