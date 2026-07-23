import { publicAssetUrl } from "../../platform/publicAssets.ts";
import { SPACE_VISUAL_TOKENS } from "../../space/spaceVisualTokens.ts";

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

export const GALLERY_GLB_URL = publicAssetUrl(`/models/space_main.glb?v=${GALLERY_GLB_REVISION}`);

/** Local Draco decoder path for compressed GLB files; avoids runtime fetches to gstatic. */
export const GLTF_DRACO_DECODER_PATH = publicAssetUrl("/draco/");

/** Temporary: spawn outside COL_outer and drop onto the floor. */
export const USE_OUTSIDE_GALLERY_SPAWN = false;

/** Meters above standing height when using outside spawn. */
export const GALLERY_OUTSIDE_SPAWN_DROP = 2;

/** Visible gallery mesh tint — only used when ENABLE_GALLERY_OVERRIDE_MATERIALS is true. */
export const GALLERY_SURFACE_COLOR = SPACE_VISUAL_TOKENS.colors.architecture;

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
 * SPACE visual hierarchy: cool fog + tuned lights. Mesh material override remains off
 * for production so Blender/glTF PBR materials drive metal, glass, and floor finish.
 * 仅在与 OVERRIDE_MATERIALS 同时为 true 时才会给 mesh 套上 toon；否则只影响雾与灯光。
 */
export const ENABLE_GALLERY_TOON = true;

/** Cel band colors sampled by gradientMap (shadow → highlight). */
export const GALLERY_TOON = {
  background: SPACE_VISUAL_TOKENS.colors.atmosphere,
  fogColor: SPACE_VISUAL_TOKENS.colors.atmosphere,
  fogNear: SPACE_VISUAL_TOKENS.fog.near,
  fogFar: SPACE_VISUAL_TOKENS.fog.far,
  /** Bump when changing gradientStops so dev HMR rebuilds the toon lookup texture. */
  gradientRevision: 5,
  gradientStops: SPACE_VISUAL_TOKENS.toonBands,
  ambientIntensity: SPACE_VISUAL_TOKENS.lighting.ambientIntensity,
  hemisphere: SPACE_VISUAL_TOKENS.lighting.hemisphere,
  keyLight: SPACE_VISUAL_TOKENS.lighting.key,
  fillLight: SPACE_VISUAL_TOKENS.lighting.fill,
  /** Linear Fog vs FogExp2 — exponential gives softer indoor falloff. */
  useExponentialFog: true,
  fogDensity: SPACE_VISUAL_TOKENS.fog.density,
  stylizedMaterials: {
    architecture: SPACE_VISUAL_TOKENS.colors.architecture,
    floor: SPACE_VISUAL_TOKENS.colors.floor,
    stair: SPACE_VISUAL_TOKENS.colors.floor,
    wall: SPACE_VISUAL_TOKENS.colors.wall,
    ceiling: SPACE_VISUAL_TOKENS.colors.ceiling,
  },
};

/**
 * Real-time shadow maps from SpacePage lights (NOT baked into the GLB).
 * Full profile only: sharp PCFShadowMap from the key light, re-rendered on
 * demand (static scene) instead of every frame. Simplified profile never
 * mounts shadow maps (profile.shadows stays false).
 */
export const ENABLE_GALLERY_RUNTIME_SHADOWS = true;

/** Sharp key-light shadow preset for the full profile. */
export const GALLERY_SHADOW = {
  mapSize: 4096,
  /**
   * Offsets wall surfaces out of their own shadow depth — kills shadow acne.
   * Keep small: the offset follows each surface normal, so perpendicular walls
   * at a corner shift their shadows in different directions and large values
   * show as shadow seams/offsets at corners (seen at 0.2).
   */
  normalBias: 0.06,
  /** Constant push along the light direction; normal-independent, so no corner seams. */
  bias: -0.0002,
  /** Orthographic shadow camera padding around the gallery bounds, in meters. */
  margin: 2,
};

/**
 * Merged inverted-hull ink outlines for stylized architecture families
 * (Messenger-style bold outer contours). Backend-agnostic: plain geometry +
 * one shared MeshBasicMaterial, no post pass required.
 */
export const ENABLE_GALLERY_INK_OUTLINES = true;

/** SPACE exhibit clones keep their authored silhouettes without ink shells. */
export const ENABLE_EXHIBIT_INK_OUTLINES = false;

export const GALLERY_INK = {
  /** World-space shell extrusion distance in meters; hugs the mesh, bold enough to read. */
  width: 0.035,
  color: SPACE_VISUAL_TOKENS.colors.inkOutline,
  /**
   * Flush-mounted meshes whose hulls poke through the adjacent surface
   * (inverted-hull failure at near-coplanar joints): the sloped skylight
   * plaster band ARCH_WALL_PLASTER_WHITE_013..022 sits flush against the
   * skylight frame, so its hull leaks onto the flat ceiling.
   */
  exemptPatterns: [/^ARCH_WALL_PLASTER_WHITE_0(?:1[3-9]|2[0-2])/],
};

/** Require WebGPURenderer for the 3D gallery (no WebGL post-processing fallback). */
export const ENABLE_GALLERY_WEBGPU = true;

/** 2K/30fps budget: WebGPU native antialias is the lightest AA path for the main walking canvas. */
export const ENABLE_GALLERY_RENDERER_ANTIALIAS = true;

/** Full-profile FXAA at the end of the TSL pipeline (flat toon color makes jaggies obvious). */
export const ENABLE_GALLERY_FXAA = true;

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

/** Full-profile GLB bulb point lights, bounded by maxCount. */
export const GALLERY_BULB = {
  intensity: 12,
  distance: 10,
  color: SPACE_VISUAL_TOKENS.colors.paper,
  maxCount: 8,
};

/** Visible emissive surface for GLB light meshes; paper white feeds bloom. */
export const GALLERY_LIGHT_EMISSIVE = {
  surfaceColor: SPACE_VISUAL_TOKENS.colors.paper,
  color: SPACE_VISUAL_TOKENS.colors.paper,
  intensity: 6.2,
};

/** Cool brushed aluminum: darker than walls/ceiling, high roughness for a matte read. */
export const GALLERY_ALUMINUM_MATERIAL = {
  color: SPACE_VISUAL_TOKENS.colors.metal,
  emissive: "#000000",
  metalness: 0.29,
  roughness: 0.86,
  envMapIntensity: 0.72,
};

/**
 * Exported glass is too faint to read against shadows (clear 0.32 / frosted 0.42).
 * Raise opacity at runtime so panes stay visible without touching the GLB.
 */
export const GALLERY_GLASS = {
  opacity: 0.55,
  frostedOpacity: 0.62,
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
  emissiveColor: SPACE_VISUAL_TOKENS.colors.paper,
  emissiveIntensity: 0.35,
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
  imageUrl: publicAssetUrl("/media/art_01.jpg"),
  position: [0, 2, -5.85] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
  maxWidth: 1.2,
  maxHeight: 1.0,
  frameBorder: 0.06,
  frameDepth: 0.04,
};
