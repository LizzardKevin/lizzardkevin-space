import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const publicRoot = path.join(repoRoot, "apps/web/public");
const manifestPath = path.join(publicRoot, "exhibits/manifest.json");
const spaceMainPath = path.join(publicRoot, "models/space_main.glb");
const outputPath = path.join(publicRoot, "exhibits/generated-exhibit-placement.json");
const dryRun = process.argv.includes("--dry-run");

function readGlbJson(filePath) {
  const data = fs.readFileSync(filePath);
  const jsonLength = data.readUInt32LE(12);
  return JSON.parse(data.toString("utf8", 20, 20 + jsonLength));
}

function decomposeNodeTransform(node) {
  return {
    position: node.translation ?? [0, 0, 0],
    rotation: node.rotation ?? [0, 0, 0, 1],
    scale: node.scale ?? [1, 1, 1],
  };
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const glb = readGlbJson(spaceMainPath);
const anchors = new Map(
  (glb.nodes ?? [])
    .filter((node) => node.name?.startsWith("ANCHOR_"))
    .map((node) => [node.name, decomposeNodeTransform(node)]),
);
anchors.set("ANCHOR_WORLD_ORIGIN", {
  position: [0, 0, 0],
  rotation: [0, 0, 0, 1],
  scale: [1, 1, 1],
});

const placements = manifest.exhibits
  .filter((exhibit) => exhibit.scene)
  .map((exhibit) => ({
    exhibitId: exhibit.exhibitId,
    anchor: exhibit.scene.anchor,
    anchorTransform: anchors.get(exhibit.scene.anchor) ?? null,
    distanceAnchor: exhibit.scene.distanceAnchor ?? null,
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
