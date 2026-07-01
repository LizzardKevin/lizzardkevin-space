import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const publicRoot = path.join(repoRoot, "apps/web/public");
const manifestPath = path.join(publicRoot, "exhibits/manifest.json");
const spaceMainPath = path.join(publicRoot, "models/space_main.glb");
const jsonOutput = process.argv.includes("--json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readGlbJson(filePath) {
  const data = fs.readFileSync(filePath);
  if (data.toString("utf8", 0, 4) !== "glTF") {
    throw new Error(`${filePath} is not a GLB file`);
  }
  const jsonLength = data.readUInt32LE(12);
  if (data.toString("utf8", 16, 20) !== "JSON") {
    throw new Error(`${filePath} first chunk is not JSON`);
  }
  return JSON.parse(data.toString("utf8", 20, 20 + jsonLength));
}

function publicUrlPath(url) {
  if (!url.startsWith("/")) return null;
  return path.join(publicRoot, url.slice(1));
}

const manifest = readJson(manifestPath);
const glb = readGlbJson(spaceMainPath);
const nodeNames = (glb.nodes ?? []).map((node) => node.name).filter(Boolean);
const exhibitAnchorNames = nodeNames.filter((name) => name.startsWith("ANCHOR_"));
const embeddedExhibitNodes = nodeNames.filter((name) => name.startsWith("exhibit_"));
const sceneExhibits = manifest.exhibits.filter((exhibit) => exhibit.scene);
const errors = [];
const warnings = [];

if (embeddedExhibitNodes.length > 0) {
  errors.push(`space_main.glb must not embed exhibit_* nodes: ${embeddedExhibitNodes.join(", ")}`);
}

if (exhibitAnchorNames.length > 0) {
  errors.push(`space_main.glb must not include exhibit ANCHOR_* markers: ${exhibitAnchorNames.join(", ")}`);
}

for (const exhibit of sceneExhibits) {
  const scene = exhibit.scene;
  if (scene.anchor !== undefined || scene.distanceAnchor !== undefined) {
    errors.push(`Exhibit ${exhibit.exhibitId} must use world coordinates and must not declare anchor fields`);
  }

  if (
    !Array.isArray(scene.lodCenter) ||
      scene.lodCenter.length !== 3 ||
      !scene.lodCenter.every((value) => typeof value === "number" && Number.isFinite(value))
  ) {
    errors.push(`Exhibit ${exhibit.exhibitId} lodCenter must be a [number, number, number] tuple`);
  }

  for (const lod of ["lod0", "lod1", "lod2"]) {
    const url = scene.models?.[lod];
    if (!url) {
      errors.push(`Exhibit ${exhibit.exhibitId} is missing ${lod} URL`);
      continue;
    }
    const filePath = publicUrlPath(url);
    if (!filePath || !fs.existsSync(filePath)) {
      errors.push(`Exhibit ${exhibit.exhibitId} LOD file is missing: ${url}`);
    }
  }

  if (scene.load?.lod2Distance > scene.load?.unloadDistance) {
    warnings.push(`Exhibit ${exhibit.exhibitId} lod2Distance exceeds unloadDistance`);
  }
}

const summary = {
  manifestPath,
  spaceMainPath,
  sceneExhibitCount: sceneExhibits.length,
  exhibitAnchorNames,
  embeddedExhibitNodes,
  warningCount: warnings.length,
  errorCount: errors.length,
  warnings,
  errors,
};

if (jsonOutput) console.log(JSON.stringify(summary, null, 2));
else {
  console.log(`scene exhibits: ${summary.sceneExhibitCount}`);
  console.log(`exhibit anchors: ${exhibitAnchorNames.join(", ") || "none"}`);
  for (const warning of warnings) console.warn(`warning: ${warning}`);
  for (const error of errors) console.error(`error: ${error}`);
}

if (errors.length > 0) process.exitCode = 1;
