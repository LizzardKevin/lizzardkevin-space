import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const publicRoot = path.join(repoRoot, "apps/web/public");
const manifestPath = path.join(publicRoot, "exhibits/manifest.json");
const outputPath = path.join(publicRoot, "exhibits/generated-exhibit-placement.json");
const dryRun = process.argv.includes("--dry-run");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const placements = manifest.exhibits
  .filter((exhibit) => exhibit.scene)
  .map((exhibit) => ({
    exhibitId: exhibit.exhibitId,
    placementMode: "world",
    lodCenter: exhibit.scene.lodCenter,
    models: exhibit.scene.models,
    scale: exhibit.scene.scale ?? 1,
    placement: exhibit.scene.placement ?? { snap: "floor", heightOffset: 0, yawOffsetDeg: 0 },
    load: exhibit.scene.load ?? {
      lod0Distance: 8,
      lod1Distance: 22,
      lod2Distance: 45,
      unloadDistance: 60,
    },
    snap: {
      status: "runtime",
      floorName: null,
    },
  }));

const cache = {
  generatedAt: new Date().toISOString(),
  source: {
    spaceMain: "/models/space_main.glb",
    manifest: "/exhibits/manifest.json",
  },
  placements,
};

if (dryRun) {
  console.log(JSON.stringify(cache, null, 2));
} else {
  fs.writeFileSync(outputPath, `${JSON.stringify(cache, null, 2)}\n`);
  console.log(`wrote ${outputPath}`);
}
