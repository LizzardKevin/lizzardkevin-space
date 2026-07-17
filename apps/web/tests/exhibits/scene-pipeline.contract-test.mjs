import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { projectPath, readProjectFile } from "../helpers/projectPaths.mjs";
import { readGlbJson } from "../helpers/glb.mjs";

const expectedScripts = [
  "scripts/validate-exhibit-scene-assets.mjs",
  "scripts/generate-exhibit-placement-cache.mjs",
  "scripts/prepare-exhibit-models.mjs",
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
assert.equal("generatedAt" in placementCache, false, "placement cache should stay deterministic");
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
  placementCache.placements.find((placement) => placement.exhibitId === "arch_treehabitat")?.distanceCenter,
  [-12.590655, 26.41809, -5.630336],
);
assert.deepEqual(
  placementCache.placements.find((placement) => placement.exhibitId === "arch_3d_printing_architecture")?.distanceCenter,
  [-12.556294, 30.178514, -15.532322],
);
assert.equal(placementCache.placements[0].snap.status, "runtime");

const modelHelp = spawnSync(process.execPath, ["scripts/prepare-exhibit-models.mjs", "--help"], {
  cwd: projectPath(),
  encoding: "utf8",
});
assert.equal(modelHelp.status, 0, modelHelp.stderr || modelHelp.stdout);
assert.match(modelHelp.stdout, /work_001\.source\.glb/);
assert.match(modelHelp.stdout, /space_work_001\.glb/);
assert.match(modelHelp.stdout, /focus_work_001\.glb/);

const materialScript = readProjectFile("scripts/apply-space-main-materials.py");
assert.doesNotMatch(materialScript, /REQUIRED_ANCHOR_MARKERS\s*=\s*\{/);
assert.match(materialScript, /remove_vertex_color_attributes/);
assert.doesNotMatch(materialScript, /ANCHOR_DEMO_(?:BOX|BASS)/);
assert.equal(existsSync(projectPath("scripts/place-treehabitat-anchor-on-platform.py")), false);
assert.equal(existsSync(projectPath("scripts/inject-space-main-anchors.mjs")), false);

const spaceDesktopExperience = readProjectFile("apps/web/src/pages/SpaceDesktopExperience.tsx");
const spaceCanvasHost = readProjectFile("apps/web/src/space/SpaceCanvasHost.tsx");
const focusOverlay = readProjectFile("apps/web/src/exhibits/FocusOverlay.tsx");
const galleryModel = readProjectFile("apps/web/src/scenes/gallery/GalleryModel.tsx");
const sceneExhibitPlacement = readProjectFile("apps/web/src/scenes/exhibits/SceneExhibitPlacement.tsx");
const spaceScene = readProjectFile("apps/web/src/scenes/SpaceScene.tsx");
assert.match(spaceDesktopExperience, /loadExhibits/);
assert.match(focusOverlay, /applyTreeHabitatSharedMaterials/);
assert.match(focusOverlay, /exhibitId=\{exhibit\.exhibitId\}/);
assert.match(spaceDesktopExperience, /manifestResolved/);
assert.match(spaceCanvasHost, /onExhibitReady={handleExhibitReady}/);
assert.match(sceneExhibitPlacement, /onExhibitDeferred/);
assert.match(spaceScene, /loadExhibits/);
assert.match(galleryModel, /loadExhibits/);
assert.match(galleryModel, /TempBlockerNotices/);
assert.doesNotMatch(
  sceneExhibitPlacement,
  /useGLTF\.preload/,
  "scene exhibits should not preload all exhibit models",
);
assert.match(
  sceneExhibitPlacement,
  /<Suspense fallback=\{null\}>/,
  "scene model loads should suspend only the individual exhibit, not the whole SPACE scene",
);
assert.match(
  sceneExhibitPlacement,
  /disposeSceneExhibitMaterials/,
  "scene exhibit clones should dispose owned material clones on unmount",
);
assert.match(
  sceneExhibitPlacement,
  /useLayoutEffect\(\(\) => \{[\s\S]*addExhibitInkOutline\(placed\.object, gltf\.scene\)[\s\S]*return \(\) => \{/,
  "scene exhibit ink setup must replay after StrictMode rehearsal cleanup",
);
assert.match(
  sceneExhibitPlacement,
  /return \(\) => \{[\s\S]*disposeExhibitInkOutline\(placed\.object\)[\s\S]*disposeSceneExhibitMaterials\(placed\.object\)/,
  "scene exhibit material cleanup should run from an unmount effect, ink shell first so the shared ink material survives",
);
assert.doesNotMatch(
  sceneExhibitPlacement,
  /activeLod|setActiveLod|chooseSceneExhibitLod|lod0|lod1|lod2/,
  "scene placement must not keep LOD switching code",
);

const exhibitBlenderScript = readProjectFile("scripts/prepare-exhibit-models-blender.py");
assert.match(exhibitBlenderScript, /arch_uabb_exhibit/);
assert.match(exhibitBlenderScript, /MODEL_TARGET_TRIANGLES/);
assert.match(exhibitBlenderScript, /"space":\s*50_000/);
assert.match(exhibitBlenderScript, /"focus":\s*150_000/);
assert.match(exhibitBlenderScript, /arch_3d_printing_architecture/);
assert.match(exhibitBlenderScript, /assign_default_material_if_missing/);
assert.match(exhibitBlenderScript, /reduce_to_triangle_budget/);
assert.match(exhibitBlenderScript, /join_mesh_objects_for_variant/);
assert.match(exhibitBlenderScript, /window/);
assert.match(exhibitBlenderScript, /mat_treehabitat_white_matte/);
assert.match(exhibitBlenderScript, /mat_treehabitat_glass_frosted/);
assert.match(exhibitBlenderScript, /model glass/);
assert.match(exhibitBlenderScript, /else:\s*[\s\S]*replace_object_material\(obj, white\)/);
assert.match(
  exhibitBlenderScript,
  /"mat_treehabitat_white_matte":[\s\S]*"base_color":\s*\(0\.96,\s*0\.96,\s*0\.94,\s*1\.0\)/,
  "Tree Habitat model white material should be slightly brighter",
);
assert.match(
  exhibitBlenderScript,
  /"mat_treehabitat_glass_frosted":[\s\S]*"base_color":\s*\(0\.68,\s*0\.70,\s*0\.70,\s*0\.40\)/,
  "Tree Habitat model glass material should be slightly greyer",
);
for (const file of [
  "apps/web/public/exhibits/arch_treehabitat/focus_arch_treehabitat.glb",
  "apps/web/public/exhibits/arch_treehabitat/space_arch_treehabitat.glb",
]) {
  assertTreehabitatRuntimeMaterials(file);
}

const printingSpace = readGlbJson(
  projectPath("apps/web/public/exhibits/arch_3d_printing_architecture/space_arch_3d_printing_architecture.glb"),
);
const printingMaterialNames = new Set((printingSpace.materials ?? []).map((material) => material.name));
assert.equal(printingMaterialNames.has("mat_treehabitat_white_matte"), true);
assert.equal(printingMaterialNames.has("mat_treehabitat_glass_frosted"), true);

console.log("exhibit scene pipeline contract tests passed");
