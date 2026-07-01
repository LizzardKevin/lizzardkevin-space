import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { readGlbJson } from "../helpers/glb.mjs";
import { importSourceModule, projectPath, readOptionalProjectFile, readProjectFile } from "../helpers/projectPaths.mjs";

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function channelSpread(hex) {
  const { r, g, b } = hexToRgb(hex);
  return Math.max(r, g, b) - Math.min(r, g, b);
}

test("stylizes architecture and floor mesh families", async () => {
  const style = await importSourceModule("scenes/gallery/galleryStyleMaterials.ts");

  assert.equal(style.shouldStylizeGalleryMaterial("ARCH_CEILING_PLASTER_WHITE_022"), true);
  assert.equal(style.shouldStylizeGalleryMaterial("STRUCT_FLOOR_MAIN"), true);
  assert.equal(style.shouldStylizeGalleryMaterial("ARCH_STAIR_001"), true);
});

test("preserves glass metal lights collisions markers and exhibits", async () => {
  const style = await importSourceModule("scenes/gallery/galleryStyleMaterials.ts");

  for (const name of [
    "GLASS_CLEAR_001",
    "METAL_ALUMINUM_RAIL_001",
    "LIGHT_GENERIC_LIGHT_PANEL_001",
    "bulb_001",
    "COL_WALL_023",
    "spawn_player_main",
    "EXHIBITS_FRAME_001",
  ]) {
    assert.equal(style.shouldPreserveGalleryMaterial(name), true, name);
    assert.equal(style.shouldStylizeGalleryMaterial(name), false, name);
  }
});

test("returns explicit material style actions for visible mesh families", async () => {
  const style = await importSourceModule("scenes/gallery/galleryStyleMaterials.ts");

  assert.equal(style.getGalleryMaterialStyleAction("ARCH_CEILING_PLASTER_WHITE_022"), "stylize");
  assert.equal(style.getGalleryMaterialStyleAction("STRUCT_FLOOR_MAIN"), "stylize");
  assert.equal(style.getGalleryMaterialStyleAction("ARCH_STAIR_001"), "stylize");
  assert.equal(style.getGalleryMaterialStyleAction("GLASS_FROSTED_001"), "preserve");
  assert.equal(style.getGalleryMaterialStyleAction("METAL_ALUMINUM_RAIL_001"), "preserve");
  assert.equal(style.getGalleryMaterialStyleAction("LIGHT_GENERIC_LIGHT_PANEL_001"), "preserve");
  assert.equal(style.getGalleryMaterialStyleAction("bulb_001"), "preserve");
  assert.equal(style.getGalleryMaterialStyleAction("EXHIBITS_FRAME_001"), "preserve");
});

test("gallery toon palette keeps architecture fog and lights near neutral", async () => {
  const { GALLERY_BULB, GALLERY_LIGHT_EMISSIVE, GALLERY_TOON } = await importSourceModule(
    "scenes/gallery/galleryConfig.ts",
  );

  const checked = [
    GALLERY_TOON.background,
    GALLERY_TOON.fogColor,
    GALLERY_TOON.hemisphere.sky,
    GALLERY_TOON.hemisphere.ground,
    GALLERY_TOON.keyLight.color,
    GALLERY_TOON.fillLight.color,
    GALLERY_BULB.color,
    GALLERY_LIGHT_EMISSIVE.color,
    ...Object.values(GALLERY_TOON.gradientStops),
    ...Object.values(GALLERY_TOON.stylizedMaterials),
  ];

  for (const color of checked) {
    assert.ok(channelSpread(color) <= 8, `${color} should be visually neutral`);
  }
});

test("stairs align to floor tone and white plaster aligns to wall tone", async () => {
  const style = await importSourceModule("scenes/gallery/galleryStyleMaterials.ts");
  const { GALLERY_TOON } = await importSourceModule("scenes/gallery/galleryConfig.ts");

  assert.equal(GALLERY_TOON.stylizedMaterials.stair, GALLERY_TOON.stylizedMaterials.floor);

  const plaster = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  plaster.name = "ARCH_CEILING_PLASTER_WHITE_022";
  const stair = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  stair.name = "ARCH_STAIR_001";

  assert.equal(style.getGalleryStylizedMaterial(plaster.name).color.getHexString(), "c8c8c8");
  assert.equal(style.getGalleryStylizedMaterial(stair.name).color.getHexString(), "787878");
});

test("metal aluminum is darker than floor with a matte metallic finish", async () => {
  const style = await importSourceModule("scenes/gallery/galleryStyleMaterials.ts");
  const { GALLERY_ALUMINUM_MATERIAL, GALLERY_TOON } = await importSourceModule(
    "scenes/gallery/galleryConfig.ts",
  );
  const metal = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: "#404040", emissive: "#202020" }),
  );
  metal.name = "METAL_ALUMINUM_RAIL_001";

  assert.equal(style.applyGallerySceneMaterialStyle(metal), true);

  const material = metal.material;
  assert.equal(`#${material.color.getHexString()}`, GALLERY_ALUMINUM_MATERIAL.color);
  const metalValue = hexToRgb(GALLERY_ALUMINUM_MATERIAL.color).r;
  const floorValue = hexToRgb(GALLERY_TOON.stylizedMaterials.floor).r;
  assert.ok(metalValue < floorValue);
  assert.ok(floorValue - metalValue >= 1);
  assert.ok(floorValue - metalValue <= 3);
  assert.equal(`#${material.emissive.getHexString()}`, GALLERY_ALUMINUM_MATERIAL.emissive);
  assert.equal(material.emissiveIntensity, 0);
  assert.equal(GALLERY_ALUMINUM_MATERIAL.metalness, 0.29);
  assert.equal(material.metalness, GALLERY_ALUMINUM_MATERIAL.metalness);
  assert.equal(material.roughness, GALLERY_ALUMINUM_MATERIAL.roughness);
  assert.equal(material.envMapIntensity, GALLERY_ALUMINUM_MATERIAL.envMapIntensity);
  assert.equal(channelSpread(`#${material.color.getHexString()}`), 0);
  assert.equal(channelSpread(`#${material.emissive.getHexString()}`), 0);

  const materialScript = readProjectFile("scripts/apply-space-main-materials.py");
  assert.match(
    materialScript,
    /"mat_metal_aluminum_soft":[\s\S]*"metallic":\s*0\.37/,
    "Blender material export should keep scene metal metallic value halved too",
  );

  const spaceMain = readGlbJson(projectPath("apps/web/public/models/space_main.glb"));
  const assetMaterial = spaceMain.materials?.find((entry) => entry.name === "mat_metal_aluminum_soft");
  assert.ok(
    Math.abs((assetMaterial?.pbrMetallicRoughness?.metallicFactor ?? 0) - 0.37) < 0.000001,
    "shipped space_main.glb should use the halved metal material too",
  );
});

test("gallery visual settings default to fixed 2K 30fps quality with lightweight AA and no bloom pass", async () => {
  const visual = await importSourceModule("space/spaceVisualSettings.ts");
  const config = visual.getSpaceQualityConfig();

  assert.equal("qualityPreset" in visual.DEFAULT_SPACE_VISUAL_SETTINGS, false);
  assert.equal(visual.DEFAULT_SPACE_VISUAL_SETTINGS.antialias, true);
  assert.equal("motionBlur" in visual.DEFAULT_SPACE_VISUAL_SETTINGS, false);
  assert.equal(config.performance.targetFps, 30);
  assert.equal(config.post.bloom.enabled, false);
  assert.ok(config.post.bloom.strength > 0);
  assert.ok(config.post.bloom.threshold >= 0.9);
  assert.equal("motionBlur" in config.post, false);
  assert.equal("celDepthLayer" in config, false);
  assert.ok(config.lighting.lightEmissiveIntensity >= 6);
});

test("legacy full-screen post and optional halos stay off by default", async () => {
  const config = await importSourceModule("scenes/gallery/galleryConfig.ts");

  assert.equal(config.ENABLE_GALLERY_BLOOM, false);
  assert.equal(config.ENABLE_GALLERY_VIGNETTE, false);
  assert.equal(config.ENABLE_GALLERY_COLOR_GRADE, false);
  assert.equal(config.ENABLE_GALLERY_LIGHT_HALOS, false);
  assert.ok(config.GALLERY_LIGHT_HALO.opacity >= 0.1);
  assert.ok(config.GALLERY_LIGHT_HALO.scale >= 4);
  assert.equal(config.GALLERY_LIGHT_HALO.maxCount, 0);
});

test("gallery does not render screen-edge overlay bars", () => {
  const css = readProjectFile("apps/web/src/styles/global.css");
  const celLayer = readOptionalProjectFile("apps/web/src/scenes/gallery/GalleryCelDepthLayer.tsx");
  const desktop = readProjectFile("apps/web/src/pages/SpaceDesktopExperience.tsx");

  assert.doesNotMatch(css, /\.space-canvasWrap::after\s*{[\s\S]*radial-gradient/);
  assert.equal(celLayer, "");
  assert.doesNotMatch(desktop, /GalleryCelDepthLayer|celDepthLayer/);
});

test("light meshes get strong neutral emissive materials for bloom", async () => {
  const style = await importSourceModule("scenes/gallery/galleryStyleMaterials.ts");
  const { GALLERY_LIGHT_EMISSIVE } = await importSourceModule("scenes/gallery/galleryConfig.ts");
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: "#f0d8a8" }),
  );
  mesh.name = "LIGHT_GENERIC_LIGHT_PANEL_001";

  assert.equal(style.applyGallerySceneMaterialStyle(mesh), true);

  const material = mesh.material;
  assert.equal(material.isMeshStandardMaterial, true);
  assert.equal(material.toneMapped, false);
  assert.ok(material.emissiveIntensity >= GALLERY_LIGHT_EMISSIVE.intensity);
  assert.equal(channelSpread(`#${material.color.getHexString()}`), 0);
  assert.equal(channelSpread(`#${material.emissive.getHexString()}`), 0);
});
