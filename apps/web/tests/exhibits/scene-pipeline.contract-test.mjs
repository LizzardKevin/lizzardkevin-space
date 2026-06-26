import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { projectPath, readProjectFile } from "../helpers/projectPaths.mjs";
import { readGlbJson } from "../helpers/glb.mjs";

const expectedScripts = [
  "scripts/validate-exhibit-scene-assets.mjs",
  "scripts/generate-exhibit-placement-cache.mjs",
  "scripts/prepare-exhibit-lods.mjs",
];

function assertTreehabitatRuntimeMaterials(file) {
  const json = readGlbJson(projectPath(file));
  const materials = new Map((json.materials ?? []).map((material) => [material.name, material]));
  const white = materials.get("mat_treehabitat_white_matte");
  const glass = materials.get("mat_treehabitat_glass_frosted");
  assert.ok(white, `${file} must include Tree Habitat white material`);
  assert.ok(glass, `${file} must include Tree Habitat glass material`);
  assert.deepEqual(white.pbrMetallicRoughness.baseColorFactor, [0.96, 0.96, 0.94, 1]);
  assert.deepEqual(glass.pbrMetallicRoughness.baseColorFactor, [0.68, 0.7, 0.7, 0.4]);
  assert.equal(glass.pbrMetallicRoughness.roughnessFactor, 0.68);
}

for (const script of expectedScripts) {
  assert.ok(existsSync(projectPath(script)), `${script} must exist`);
}

const validate = spawnSync(process.execPath, ["scripts/validate-exhibit-scene-assets.mjs", "--json"], {
  cwd: projectPath(),
  encoding: "utf8",
});
assert.equal(validate.status, 0, validate.stderr || validate.stdout);
const validation = JSON.parse(validate.stdout);
assert.equal(validation.errorCount, 0);
assert.ok(validation.sceneExhibitCount >= 1);
assert.ok(validation.anchorNames.includes("ANCHOR_ARCH_TREEHABITAT"));

const cache = spawnSync(process.execPath, ["scripts/generate-exhibit-placement-cache.mjs", "--dry-run"], {
  cwd: projectPath(),
  encoding: "utf8",
});
assert.equal(cache.status, 0, cache.stderr || cache.stdout);
const placementCache = JSON.parse(cache.stdout);
assert.ok(Array.isArray(placementCache.placements));
assert.ok(!placementCache.placements.some((placement) => placement.exhibitId === "demo_box"));
assert.ok(!placementCache.placements.some((placement) => placement.exhibitId === "demo_bass"));
assert.ok(placementCache.placements.some((placement) => placement.exhibitId === "arch_treehabitat"));
assert.equal(placementCache.placements[0].snap.status, "runtime");

const lodHelp = spawnSync(process.execPath, ["scripts/prepare-exhibit-lods.mjs", "--help"], {
  cwd: projectPath(),
  encoding: "utf8",
});
assert.equal(lodHelp.status, 0, lodHelp.stderr || lodHelp.stdout);
assert.match(lodHelp.stdout, /work_001\.source\.glb/);
assert.match(lodHelp.stdout, /lod0/);
assert.match(lodHelp.stdout, /lod1/);
assert.match(lodHelp.stdout, /lod2/);

const materialScript = readProjectFile("scripts/apply-space-main-materials.py");
const anchorScript = readProjectFile("scripts/inject-space-main-anchors.mjs");
assert.match(materialScript, /def normalize_anchor_name/);
assert.match(materialScript, /ANCHOR_/);
assert.match(materialScript, /ANCHOR-/);
assert.match(materialScript, /remove_vertex_color_attributes/);
assert.doesNotMatch(materialScript, /ANCHOR_DEMO_(?:BOX|BASS)/);
assert.doesNotMatch(anchorScript, /ANCHOR_DEMO_(?:BOX|BASS)/);

const spaceDesktopExperience = readProjectFile("apps/web/src/pages/SpaceDesktopExperience.tsx");
const galleryModel = readProjectFile("apps/web/src/scenes/gallery/GalleryModel.tsx");
const spaceScene = readProjectFile("apps/web/src/scenes/SpaceScene.tsx");
assert.match(spaceDesktopExperience, /loadExhibits/);
assert.match(spaceDesktopExperience, /onSceneExhibitsReady/);
assert.match(spaceScene, /loadExhibits/);
assert.match(galleryModel, /loadExhibits/);

const lodBlenderScript = readProjectFile("scripts/prepare-exhibit-lods-blender.py");
assert.match(lodBlenderScript, /mat_treehabitat_white_matte/);
assert.match(lodBlenderScript, /mat_treehabitat_glass_frosted/);
assert.match(lodBlenderScript, /model white/);
assert.match(lodBlenderScript, /model glass/);
assert.match(
  lodBlenderScript,
  /"mat_treehabitat_white_matte":[\s\S]*"base_color":\s*\(0\.96,\s*0\.96,\s*0\.94,\s*1\.0\)/,
  "Tree Habitat model white material should be slightly brighter",
);
assert.match(
  lodBlenderScript,
  /"mat_treehabitat_glass_frosted":[\s\S]*"base_color":\s*\(0\.68,\s*0\.70,\s*0\.70,\s*0\.40\)/,
  "Tree Habitat model glass material should be slightly greyer",
);
for (const file of [
  "apps/web/public/exhibits/arch_treehabitat/focus_arch_treehabitat.glb",
  "apps/web/public/exhibits/arch_treehabitat/arch_treehabitat.lod0.glb",
  "apps/web/public/exhibits/arch_treehabitat/arch_treehabitat.lod1.glb",
  "apps/web/public/exhibits/arch_treehabitat/arch_treehabitat.lod2.glb",
]) {
  assertTreehabitatRuntimeMaterials(file);
}

console.log("exhibit scene pipeline contract tests passed");
