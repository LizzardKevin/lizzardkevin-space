import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const expectedScripts = [
  "scripts/validate-exhibit-scene-assets.mjs",
  "scripts/generate-exhibit-placement-cache.mjs",
  "scripts/prepare-exhibit-lods.mjs",
];

for (const script of expectedScripts) {
  assert.ok(existsSync(script), `${script} must exist`);
}

const validate = spawnSync(process.execPath, ["scripts/validate-exhibit-scene-assets.mjs", "--json"], {
  encoding: "utf8",
});
assert.equal(validate.status, 0, validate.stderr || validate.stdout);
const validation = JSON.parse(validate.stdout);
assert.equal(validation.errorCount, 0);
assert.ok(validation.sceneExhibitCount >= 2);
assert.ok(validation.anchorNames.includes("ANCHOR_DEMO_BOX"));
assert.ok(validation.anchorNames.includes("ANCHOR_DEMO_BASS"));
assert.ok(validation.anchorNames.includes("ANCHOR_ARCH_TREEHABITAT"));

const cache = spawnSync(process.execPath, ["scripts/generate-exhibit-placement-cache.mjs", "--dry-run"], {
  encoding: "utf8",
});
assert.equal(cache.status, 0, cache.stderr || cache.stdout);
const placementCache = JSON.parse(cache.stdout);
assert.ok(Array.isArray(placementCache.placements));
assert.ok(placementCache.placements.some((placement) => placement.exhibitId === "demo_box"));
assert.ok(placementCache.placements.some((placement) => placement.exhibitId === "demo_bass"));
assert.ok(placementCache.placements.some((placement) => placement.exhibitId === "arch_treehabitat"));
assert.equal(placementCache.placements[0].snap.status, "runtime");

const lodHelp = spawnSync(process.execPath, ["scripts/prepare-exhibit-lods.mjs", "--help"], {
  encoding: "utf8",
});
assert.equal(lodHelp.status, 0, lodHelp.stderr || lodHelp.stdout);
assert.match(lodHelp.stdout, /work_001\.source\.glb/);
assert.match(lodHelp.stdout, /lod0/);
assert.match(lodHelp.stdout, /lod1/);
assert.match(lodHelp.stdout, /lod2/);

const materialScript = readFileSync("scripts/apply-space-main-materials.py", "utf8");
assert.match(materialScript, /def normalize_anchor_name/);
assert.match(materialScript, /ANCHOR_/);
assert.match(materialScript, /ANCHOR-/);
assert.match(materialScript, /remove_vertex_color_attributes/);

const spaceDesktopExperience = readFileSync("apps/web/src/pages/SpaceDesktopExperience.tsx", "utf8");
const galleryModel = readFileSync("apps/web/src/scenes/gallery/GalleryModel.tsx", "utf8");
const spaceScene = readFileSync("apps/web/src/scenes/SpaceScene.tsx", "utf8");
assert.match(spaceDesktopExperience, /loadExhibits/);
assert.match(spaceDesktopExperience, /onSceneExhibitsReady/);
assert.match(spaceScene, /loadExhibits/);
assert.match(galleryModel, /loadExhibits/);

const lodBlenderScript = readFileSync("scripts/prepare-exhibit-lods-blender.py", "utf8");
assert.match(lodBlenderScript, /mat_treehabitat_white_matte/);
assert.match(lodBlenderScript, /mat_treehabitat_glass_frosted/);
assert.match(lodBlenderScript, /model white/);
assert.match(lodBlenderScript, /model glass/);

console.log("exhibit scene pipeline contract tests passed");
