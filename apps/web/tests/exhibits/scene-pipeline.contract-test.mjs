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
  "scripts/reduce-space-main-colliders.py",
];

function assertClose(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 0.000001,
    `${message}: expected ${expected}, got ${actual}`,
  );
}

function assertColorClose(actual, expected, message) {
  assert.equal(actual.length, expected.length, `${message}: channel count`);
  for (let index = 0; index < expected.length; index += 1) {
    assertClose(actual[index], expected[index], `${message}[${index}]`);
  }
}

function assertTreehabitatRuntimeMaterials(file) {
  const json = readGlbJson(projectPath(file));
  const materials = new Map((json.materials ?? []).map((material) => [material.name, material]));
  const white = materials.get("mat_treehabitat_white_matte");
  const glass = materials.get("mat_treehabitat_glass_frosted");
  assert.ok(white, `${file} must include Tree Habitat white material`);
  assert.ok(glass, `${file} must include Tree Habitat glass material`);
  assertColorClose(white.pbrMetallicRoughness.baseColorFactor, [0.96, 0.96, 0.94, 1], `${file} white baseColorFactor`);
  assertColorClose(glass.pbrMetallicRoughness.baseColorFactor, [0.68, 0.7, 0.7, 0.4], `${file} glass baseColorFactor`);
  assertClose(glass.pbrMetallicRoughness.roughnessFactor, 0.68, `${file} glass roughnessFactor`);
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
assert.ok(validation.sceneExhibitCount >= 3);
assert.deepEqual(validation.exhibitAnchorNames, []);

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
assert.ok(placementCache.placements.some((placement) => placement.exhibitId === "arch_uabb_exhibit"));
assert.ok(placementCache.placements.some((placement) => placement.exhibitId === "arch_3d_printing_architecture"));
assert.ok(
  placementCache.placements
    .filter((placement) =>
      ["arch_treehabitat", "arch_uabb_exhibit", "arch_3d_printing_architecture"].includes(placement.exhibitId),
    )
    .every((placement) => placement.placementMode === "world" && !("anchor" in placement)),
  "world-coordinate exhibit GLBs should not use runtime anchors",
);
assert.deepEqual(
  placementCache.placements.find((placement) => placement.exhibitId === "arch_treehabitat")?.lodCenter,
  [-12.590655, 26.41809, -5.630336],
);
assert.deepEqual(
  placementCache.placements.find((placement) => placement.exhibitId === "arch_3d_printing_architecture")?.lodCenter,
  [-12.556294, 30.178514, -15.532322],
);
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
assert.doesNotMatch(materialScript, /REQUIRED_ANCHOR_MARKERS\s*=\s*\{/);
assert.match(materialScript, /remove_vertex_color_attributes/);
assert.doesNotMatch(materialScript, /ANCHOR_DEMO_(?:BOX|BASS)/);
assert.equal(existsSync(projectPath("scripts/place-treehabitat-anchor-on-platform.py")), false);
assert.equal(existsSync(projectPath("scripts/inject-space-main-anchors.mjs")), false);

const spaceDesktopExperience = readProjectFile("apps/web/src/pages/SpaceDesktopExperience.tsx");
const focusOverlay = readProjectFile("apps/web/src/exhibits/FocusOverlay.tsx");
const galleryModel = readProjectFile("apps/web/src/scenes/gallery/GalleryModel.tsx");
const sceneExhibitPlacement = readProjectFile("apps/web/src/scenes/exhibits/SceneExhibitPlacement.tsx");
const spaceScene = readProjectFile("apps/web/src/scenes/SpaceScene.tsx");
assert.match(spaceDesktopExperience, /loadExhibits/);
assert.match(focusOverlay, /applyTreeHabitatSharedMaterials/);
assert.match(focusOverlay, /exhibitId=\{exhibit\.exhibitId\}/);
assert.match(spaceDesktopExperience, /onSceneExhibitsReady/);
assert.match(spaceScene, /loadExhibits/);
assert.match(galleryModel, /loadExhibits/);
assert.match(galleryModel, /TempBlockerNotices/);
assert.doesNotMatch(
  sceneExhibitPlacement,
  /useGLTF\.preload/,
  "scene exhibits should load the active LOD only instead of preloading every scene model",
);
assert.match(
  sceneExhibitPlacement,
  /<Suspense fallback=\{null\}>/,
  "active LOD loads should suspend only the individual exhibit, not the whole SPACE scene",
);
assert.match(
  sceneExhibitPlacement,
  /startTransition\(\(\) => setActiveLod\(next\)\)/,
  "LOD switches should keep the previous revealed exhibit while the next GLB resolves",
);

const lodBlenderScript = readProjectFile("scripts/prepare-exhibit-lods-blender.py");
assert.match(lodBlenderScript, /arch_uabb_exhibit/);
assert.match(lodBlenderScript, /LOD_TARGET_TRIANGLES/);
assert.match(lodBlenderScript, /"lod0":\s*150_000/);
assert.match(lodBlenderScript, /"lod1":\s*80_000/);
assert.match(lodBlenderScript, /"lod2":\s*30_000/);
assert.match(lodBlenderScript, /arch_3d_printing_architecture/);
assert.match(lodBlenderScript, /assign_default_material_if_missing/);
assert.match(lodBlenderScript, /reduce_to_triangle_budget/);
assert.match(lodBlenderScript, /join_mesh_objects_for_lod/);
assert.match(lodBlenderScript, /window/);
assert.match(lodBlenderScript, /mat_treehabitat_white_matte/);
assert.match(lodBlenderScript, /mat_treehabitat_glass_frosted/);
assert.match(lodBlenderScript, /model glass/);
assert.match(lodBlenderScript, /else:\s*[\s\S]*replace_object_material\(obj, white\)/);
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

const printingLod = readGlbJson(
  projectPath("apps/web/public/exhibits/arch_3d_printing_architecture/arch_3d_printing_architecture.lod0.glb"),
);
const printingMaterialNames = new Set((printingLod.materials ?? []).map((material) => material.name));
assert.equal(printingMaterialNames.has("mat_treehabitat_white_matte"), true);
assert.equal(printingMaterialNames.has("mat_treehabitat_glass_frosted"), true);

console.log("exhibit scene pipeline contract tests passed");
