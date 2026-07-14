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

test("gallery toon palette uses the approved SPACE hierarchy", async () => {
  const { GALLERY_BULB, GALLERY_LIGHT_EMISSIVE, GALLERY_TOON } = await importSourceModule(
    "scenes/gallery/galleryConfig.ts",
  );

  assert.equal(GALLERY_TOON.background, "#a9bfbc");
  assert.equal(GALLERY_TOON.fogColor, "#a9bfbc");
  assert.equal(GALLERY_TOON.hemisphere.sky, "#dce9e4");
  assert.equal(GALLERY_TOON.hemisphere.ground, "#3f4d4d");
  assert.equal(GALLERY_TOON.keyLight.color, "#f3f0e7");
  assert.equal(GALLERY_TOON.fillLight.color, "#67c2be");
  assert.equal(GALLERY_BULB.color, "#f3f0e7");
  assert.equal(GALLERY_LIGHT_EMISSIVE.color, "#f3f0e7");
  assert.deepEqual(GALLERY_TOON.gradientStops, {
    shadow: "#31413f",
    mid: "#69827e",
    light: "#b9cbc6",
    highlight: "#f3f0e7",
  });
});

test("stairs align to floor tone and white plaster aligns to wall tone", async () => {
  const style = await importSourceModule("scenes/gallery/galleryStyleMaterials.ts");
  const { GALLERY_TOON } = await importSourceModule("scenes/gallery/galleryConfig.ts");

  assert.equal(GALLERY_TOON.stylizedMaterials.stair, GALLERY_TOON.stylizedMaterials.floor);

  const plaster = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  plaster.name = "ARCH_CEILING_PLASTER_WHITE_022";
  const stair = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  stair.name = "ARCH_STAIR_001";

  assert.equal(style.getGalleryStylizedMaterial(plaster.name).color.getHexString(), "9eaeaa");
  assert.equal(style.getGalleryStylizedMaterial(stair.name).color.getHexString(), "3f4d4d");
});

test("metal aluminum is darker than walls and ceiling with a matte metallic finish", async () => {
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
  assert.equal(GALLERY_ALUMINUM_MATERIAL.color, "#667271");
  const metalRgb = hexToRgb(GALLERY_ALUMINUM_MATERIAL.color);
  const wallRgb = hexToRgb(GALLERY_TOON.stylizedMaterials.wall);
  const ceilingRgb = hexToRgb(GALLERY_TOON.stylizedMaterials.ceiling);
  const channelTotal = ({ r, g, b }) => r + g + b;
  assert.ok(channelTotal(metalRgb) < channelTotal(wallRgb));
  assert.ok(channelTotal(metalRgb) < channelTotal(ceilingRgb));
  assert.equal(`#${material.emissive.getHexString()}`, GALLERY_ALUMINUM_MATERIAL.emissive);
  assert.equal(material.emissiveIntensity, 0);
  assert.equal(GALLERY_ALUMINUM_MATERIAL.metalness, 0.29);
  assert.equal(material.metalness, GALLERY_ALUMINUM_MATERIAL.metalness);
  assert.equal(material.roughness, GALLERY_ALUMINUM_MATERIAL.roughness);
  assert.equal(material.envMapIntensity, GALLERY_ALUMINUM_MATERIAL.envMapIntensity);
  assert.ok(channelSpread(`#${material.color.getHexString()}`) > 0);
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

test("gallery visual settings default to the full renderer profile with restrained bloom", async () => {
  const visual = await importSourceModule("space/spaceVisualSettings.ts");
  const config = visual.getSpaceQualityConfig();

  assert.equal(visual.DEFAULT_SPACE_VISUAL_SETTINGS.qualityPreset, "full");
  assert.equal("antialias" in visual.DEFAULT_SPACE_VISUAL_SETTINGS, false);
  assert.equal("motionBlur" in visual.DEFAULT_SPACE_VISUAL_SETTINGS, false);
  assert.equal(config.performance.targetFps, 30);
  assert.equal(config.post.bloom.enabled, true);
  assert.ok(config.post.bloom.strength > 0);
  assert.ok(config.post.bloom.strength <= 0.08);
  assert.ok(config.post.bloom.threshold >= 0.9);
  assert.equal("motionBlur" in config.post, false);
  assert.equal("celDepthLayer" in config, false);
  assert.ok(config.lighting.lightEmissiveIntensity >= 6);
});

test("quality profile is the only bloom authority and optional global effects stay off", async () => {
  const config = await importSourceModule("scenes/gallery/galleryConfig.ts");

  assert.equal("ENABLE_GALLERY_BLOOM" in config, false);
  assert.equal("GALLERY_BLOOM" in config, false);
  assert.equal(config.ENABLE_GALLERY_VIGNETTE, false);
  assert.equal(config.ENABLE_GALLERY_COLOR_GRADE, false);
  assert.equal(config.ENABLE_GALLERY_LIGHT_HALOS, false);
  assert.ok(config.GALLERY_LIGHT_HALO.opacity >= 0.1);
  assert.ok(config.GALLERY_LIGHT_HALO.scale >= 4);
  assert.equal(config.GALLERY_LIGHT_HALO.maxCount, 0);
});

test("preserved exhibit materials keep their authored color and properties", async () => {
  const style = await importSourceModule("scenes/gallery/galleryStyleMaterials.ts");
  const material = new THREE.MeshStandardMaterial({
    color: "#b13456",
    emissive: "#1256a0",
    emissiveIntensity: 0.7,
    metalness: 0.41,
    roughness: 0.23,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.name = "EXHIBITS_AUTHORED_COLOR_001";

  assert.equal(style.applyGallerySceneMaterialStyle(mesh), false);
  assert.equal(mesh.material, material);
  assert.equal(`#${material.color.getHexString()}`, "#b13456");
  assert.equal(`#${material.emissive.getHexString()}`, "#1256a0");
  assert.equal(material.emissiveIntensity, 0.7);
  assert.equal(material.metalness, 0.41);
  assert.equal(material.roughness, 0.23);
});

test("gallery does not render screen-edge overlay bars", () => {
  const css = readProjectFile("apps/web/src/styles/global.css");
  const celLayer = readOptionalProjectFile("apps/web/src/scenes/gallery/GalleryCelDepthLayer.tsx");
  const desktop = readProjectFile("apps/web/src/pages/SpaceDesktopExperience.tsx");

  assert.doesNotMatch(css, /\.space-canvasWrap::after\s*{[\s\S]*radial-gradient/);
  assert.equal(celLayer, "");
  assert.doesNotMatch(desktop, /GalleryCelDepthLayer|celDepthLayer/);
});

test("light meshes get strong paper emissive materials for bloom", async () => {
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
  assert.equal(`#${material.color.getHexString()}`, "#f3f0e7");
  assert.equal(`#${material.emissive.getHexString()}`, "#f3f0e7");
});

test("reuses and reconfigures a runtime-owned light material on repeated preparation", async () => {
  const style = await importSourceModule("scenes/gallery/galleryStyleMaterials.ts");
  const { GALLERY_LIGHT_EMISSIVE } = await importSourceModule("scenes/gallery/galleryConfig.ts");
  const authoredMaterial = new THREE.MeshStandardMaterial({
    color: "#806040",
    emissive: "#201000",
    emissiveIntensity: 0.25,
  });
  authoredMaterial.userData = { authored: true };
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), authoredMaterial);
  mesh.name = "LIGHT_GENERIC_LIGHT_PANEL_REPEAT";

  assert.equal(style.applyGallerySceneMaterialStyle(mesh), true);
  const runtimeMaterial = mesh.material;
  assert.notEqual(runtimeMaterial, authoredMaterial);
  assert.deepEqual(authoredMaterial.userData, { authored: true });

  runtimeMaterial.color.set("#000000");
  runtimeMaterial.emissive.set("#000000");
  runtimeMaterial.emissiveIntensity = 0;
  runtimeMaterial.toneMapped = true;

  assert.equal(style.applyGallerySceneMaterialStyle(mesh), true);
  assert.equal(mesh.material, runtimeMaterial);
  assert.deepEqual(authoredMaterial.userData, { authored: true });
  assert.equal(`#${runtimeMaterial.color.getHexString()}`, GALLERY_LIGHT_EMISSIVE.surfaceColor);
  assert.equal(`#${runtimeMaterial.emissive.getHexString()}`, GALLERY_LIGHT_EMISSIVE.color);
  assert.equal(runtimeMaterial.emissiveIntensity, GALLERY_LIGHT_EMISSIVE.intensity);
  assert.equal(runtimeMaterial.toneMapped, false);
});

test("reuses every runtime-owned material in a light material array", async () => {
  const style = await importSourceModule("scenes/gallery/galleryStyleMaterials.ts");
  const { GALLERY_LIGHT_EMISSIVE } = await importSourceModule("scenes/gallery/galleryConfig.ts");
  const authoredMaterials = [
    new THREE.MeshStandardMaterial({ color: "#94724f", emissive: "#100800" }),
    new THREE.MeshBasicMaterial({ color: "#806c58", opacity: 0.6, transparent: true }),
  ];
  authoredMaterials[0].userData = { authoredSlot: 0 };
  authoredMaterials[1].userData = { authoredSlot: 1 };
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), authoredMaterials);
  mesh.name = "bulb_REPEAT_ARRAY";

  assert.equal(style.applyGallerySceneMaterialStyle(mesh), true);
  const runtimeMaterials = [...mesh.material];
  runtimeMaterials.forEach((material, index) => {
    assert.notEqual(material, authoredMaterials[index]);
    material.color.set("#000000");
    material.emissive.set("#000000");
    material.emissiveIntensity = 0;
    material.toneMapped = true;
  });

  assert.equal(style.applyGallerySceneMaterialStyle(mesh), true);
  assert.equal(mesh.material[0], runtimeMaterials[0]);
  assert.equal(mesh.material[1], runtimeMaterials[1]);
  assert.deepEqual(authoredMaterials[0].userData, { authoredSlot: 0 });
  assert.deepEqual(authoredMaterials[1].userData, { authoredSlot: 1 });
  for (const material of mesh.material) {
    assert.equal(material.isMeshStandardMaterial, true);
    assert.equal(`#${material.color.getHexString()}`, GALLERY_LIGHT_EMISSIVE.surfaceColor);
    assert.equal(`#${material.emissive.getHexString()}`, GALLERY_LIGHT_EMISSIVE.color);
    assert.equal(material.emissiveIntensity, GALLERY_LIGHT_EMISSIVE.intensity);
    assert.equal(material.toneMapped, false);
  }
});
