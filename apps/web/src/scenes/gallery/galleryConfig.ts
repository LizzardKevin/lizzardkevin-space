export const ENABLE_GALLERY_GLB = true;

/** Set true after placing public/media/art_01.jpg (or update GALLERY_WALL_ART.imageUrl). */
export const ENABLE_GALLERY_WALL_ART = false;

/** Fallback spawn before GLB resolves (overwritten once gallery loads). */
export const GALLERY_SPAWN: [number, number, number] = [5.034, 0.92, -0.865];

/** Bump when replacing gallery_main.glb so dev/browser reloads geometry. */
export const GALLERY_GLB_REVISION = "20260607";

export const GALLERY_GLB_URL = `/models/gallery_main.glb?v=${GALLERY_GLB_REVISION}`;

/** Temporary: spawn outside COL_outer and drop onto the floor. */
export const USE_OUTSIDE_GALLERY_SPAWN = false;

/** Meters above standing height when using outside spawn. */
export const GALLERY_OUTSIDE_SPAWN_DROP = 2;

/** Visible gallery mesh tint — only used when ENABLE_GALLERY_OVERRIDE_MATERIALS is true. */
export const GALLERY_SURFACE_COLOR = "#c0bab0";

/**
 * false = 保留 gallery_main.glb 内 Blender/glTF 材质（Principled、Emission 等）。
 * true = 加载时整场景替换为统一 toon/纯色（会丢弃导出材质）。
 */
export const ENABLE_GALLERY_OVERRIDE_MATERIALS = false;

/**
 * Firewatch-style toon look: stepped MeshToonMaterial + fog + tuned lights.
 * 仅在与 OVERRIDE_MATERIALS 同时为 true 时才会给 mesh 套上 toon；否则只影响雾与灯光。
 */
export const ENABLE_GALLERY_TOON = true;

/** Cel band colors sampled by gradientMap (shadow → highlight). */
export const GALLERY_TOON = {
  background: "#c8ccb4",
  fogColor: "#c8ccb4",
  fogNear: 10,
  fogFar: 32,
  /** Bump when changing gradientStops so dev HMR rebuilds the toon lookup texture. */
  gradientRevision: 3,
  /** Yellow-green highlights + teal shadows (Firewatch hazy morning). */
  gradientStops: {
    shadow: "#3a5248",
    mid: "#6a7260",
    light: "#a8a070",
    highlight: "#e4dcb8",
  },
  ambientIntensity: 0.16,
  hemisphere: { sky: "#d4d8b8", ground: "#3d5248", intensity: 0.5 },
  keyLight: { position: [-10, 5, 5] as [number, number, number], intensity: 2.0, color: "#e8dcb0" },
  fillLight: { position: [5, 3, -7] as [number, number, number], intensity: 0.5, color: "#587068" },
  /** Linear Fog vs FogExp2 — exponential gives softer indoor falloff. */
  useExponentialFog: true,
  fogDensity: 0.028,
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
  color: "#e8d898",
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
