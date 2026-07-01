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
export const GALLERY_GLB_REVISION = "20260701-world-exhibits-no-anchors";

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
 * Low-cost Flat Kit inspired pass: stylize only large architecture/floor/stair
 * families while preserving glass, metal, emissive lights, exhibits, and helpers.
 */
export const ENABLE_GALLERY_SELECTIVE_STYLIZATION = true;

/**
 * Neutral space look: soft fog + tuned lights. Mesh material override remains off
 * for production so Blender/glTF PBR materials drive metal, glass, and floor finish.
 * 仅在与 OVERRIDE_MATERIALS 同时为 true 时才会给 mesh 套上 toon；否则只影响雾与灯光。
 */
export const ENABLE_GALLERY_TOON = true;

/** Cel band colors sampled by gradientMap (shadow → highlight). */
export const GALLERY_TOON = {
  background: "#d5d5d5",
  fogColor: "#d5d5d5",
  fogNear: 12,
  fogFar: 42,
  /** Bump when changing gradientStops so dev HMR rebuilds the toon lookup texture. */
  gradientRevision: 4,
  /** Neutral grayscale bands, used only when material override is enabled. */
  gradientStops: {
    shadow: "#343434",
    mid: "#727272",
    light: "#b8b8b8",
    highlight: "#f2f2f2",
  },
  ambientIntensity: 0.22,
  hemisphere: { sky: "#e2e2e2", ground: "#707070", intensity: 0.5 },
  keyLight: { position: [-8, 5, 6] as [number, number, number], intensity: 1.15, color: "#f4f4f4" },
  fillLight: { position: [5, 3, -7] as [number, number, number], intensity: 0.18, color: "#c8c8c8" },
  /** Linear Fog vs FogExp2 — exponential gives softer indoor falloff. */
  useExponentialFog: true,
  fogDensity: 0.0105,
  stylizedMaterials: {
    architecture: "#d0d0d0",
    floor: "#787878",
    stair: "#787878",
    wall: "#c8c8c8",
    ceiling: "#e0e0e0",
  },
};

/**
 * Real-time shadow maps from SpacePage lights (NOT baked into the GLB).
 * Set false for flat gallery look after removing Blender sun lights.
 */
export const ENABLE_GALLERY_RUNTIME_SHADOWS = false;

/** Require WebGPURenderer for the 3D gallery (no WebGL post-processing fallback). */
export const ENABLE_GALLERY_WEBGPU = true;

/** 2K/30fps budget: WebGPU native antialias is the lightest AA path for the main walking canvas. */
export const ENABLE_GALLERY_RENDERER_ANTIALIAS = true;

/** Light bloom on bright window edges / highlights (toon + fog path). */
export const ENABLE_GALLERY_BLOOM = false;

export const GALLERY_BLOOM = {
  strength: 0.54,
  radius: 0.28,
  threshold: 0.72,
};

/** Single-node color grade inside the existing WebGPU render pipeline. */
export const ENABLE_GALLERY_COLOR_GRADE = false;

export const GALLERY_COLOR_GRADE = {
  brightness: 1.02,
  contrast: 1.08,
  saturation: 0.93,
  tint: "#f5f1df",
  tintStrength: 0.05,
};

/** Subtle vignette for Firewatch depth/contrast. */
export const ENABLE_GALLERY_VIGNETTE = false;

export const GALLERY_VIGNETTE = {
  /** Darkening strength at the corners. */
  strength: 0.24,
  /** Start radius (0..1). Smaller = vignette starts closer to center. */
  inner: 0.38,
  /** End radius (0..1). Larger = softer falloff to corners. */
  outer: 0.95,
};

/** GLB bulb_* mesh point lights — pale yellow, not orange. */
export const GALLERY_BULB = {
  intensity: 12,
  distance: 10,
  color: "#f6f6f6",
};

/** Visible emissive surface for GLB light meshes; neutral white feeds bloom. */
export const GALLERY_LIGHT_EMISSIVE = {
  surfaceColor: "#f5f5f5",
  color: "#ffffff",
  intensity: 6.2,
};

/** Neutral brushed aluminum: darker than floor, high roughness for a matte metal read. */
export const GALLERY_ALUMINUM_MATERIAL = {
  color: "#767676",
  emissive: "#000000",
  metalness: 0.29,
  roughness: 0.86,
  envMapIntensity: 0.72,
};

/** Optional additive light sprites; disabled by default to protect 2K/60. */
export const ENABLE_GALLERY_LIGHT_HALOS = false;

export const GALLERY_LIGHT_HALO = {
  color: "#ffffff",
  opacity: 0.12,
  scale: 4.8,
  maxCount: 0,
};

/** Exhibit raycast label + hover highlight tuning. */
export const EXHIBIT_TARGET = {
  emissiveColor: "#ffffff",
  emissiveIntensity: 0.06,
  /** Max camera-to-exhibit distance (m) for hover label, highlight, and crosshair feedback. */
  maxDistance: 5,
  /** Canvas UI label shown below the center cursor while hovering an exhibit. */
  labelHtml: {
    fontSizePx: 18,
    cursorOffsetYPx: 30,
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
