import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const help = `Usage:
  node scripts/prepare-exhibit-lods.mjs apps/web/public/exhibits/work_001/work_001.source.glb

Input naming:
  public/exhibits/work_001/work_001.source.glb

Outputs:
  work_001.lod0.glb
  work_001.lod1.glb
  work_001.lod2.glb
  work_001.report.json

This script uses Blender Decimate when Blender is available. Set BLENDER to an
explicit executable path when Blender is not on PATH.`;

if (process.argv.includes("--help") || process.argv.length < 3) {
  console.log(help);
  process.exit(process.argv.includes("--help") ? 0 : 1);
}

const sourcePath = path.resolve(process.argv[2]);
if (!fs.existsSync(sourcePath)) {
  throw new Error(`Source GLB not found: ${sourcePath}`);
}

const force = process.argv.includes("--force");
const noBlender = process.argv.includes("--no-blender");
const dir = path.dirname(sourcePath);
const sourceName = path.basename(sourcePath);
const exhibitId = sourceName.replace(/\.source\.glb$/i, "");
if (exhibitId === sourceName) {
  throw new Error("Source file must use <exhibitId>.source.glb naming");
}

function findBlenderExecutable() {
  const candidates = [
    process.env.BLENDER,
    "D:\\00 Blender\\blender.exe",
    "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe",
    "C:\\Program Files\\Blender Foundation\\Blender 5.0\\blender.exe",
    "C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe",
    "C:\\Program Files\\Blender Foundation\\Blender 4.4\\blender.exe",
    "C:\\Program Files\\Blender Foundation\\Blender 4.3\\blender.exe",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  const where = spawnSync("where.exe", ["blender"], { encoding: "utf8", windowsHide: true });
  if (where.status === 0) {
    const first = where.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    if (first) return first;
  }
  return null;
}

function copyFallback() {
  const sourceSize = fs.statSync(sourcePath).size;
  const outputs = ["lod0", "lod1", "lod2"].map((lod) => {
    const outputPath = path.join(dir, `${exhibitId}.${lod}.glb`);
    if (!force && fs.existsSync(outputPath)) {
      throw new Error(`${outputPath} already exists. Pass --force to overwrite.`);
    }
    fs.copyFileSync(sourcePath, outputPath);
    return {
      lod,
      path: outputPath,
      fileSizeBytes: fs.statSync(outputPath).size,
      targetFaceRatio:
        lod === "lod0" ? "1.0" : lod === "lod1" ? "0.30-0.50" : "0.05-0.15",
      manualReviewRequired: lod !== "lod0",
    };
  });

  return {
    source: sourcePath,
    sourceFileSizeBytes: sourceSize,
    method: "placeholder-copy",
    nextStep: "Run Blender Decimate or glTF Transform simplify for lod1/lod2, then inspect hard edges, text, thin rods, and stair-stepped details.",
    outputs,
  };
}

for (const lod of ["lod0", "lod1", "lod2"]) {
  const outputPath = path.join(dir, `${exhibitId}.${lod}.glb`);
  if (!force && fs.existsSync(outputPath)) {
    throw new Error(`${outputPath} already exists. Pass --force to overwrite.`);
  }
}

let report;
const blender = noBlender ? null : findBlenderExecutable();
if (blender) {
  const blenderScript = path.resolve("scripts/prepare-exhibit-lods-blender.py");
  const result = spawnSync(
    blender,
    ["--background", "--python", blenderScript, "--", sourcePath, exhibitId, dir],
    { encoding: "utf8", windowsHide: true },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Blender exited with ${result.status}`);
  }
  const marker = "LOD_REPORT_JSON=";
  const line = result.stdout.split(/\r?\n/).find((item) => item.startsWith(marker));
  if (!line) {
    throw new Error(`Blender LOD script did not print ${marker}`);
  }
  report = JSON.parse(line.slice(marker.length));
} else {
  report = copyFallback();
}

const reportPath = path.join(dir, `${exhibitId}.report.json`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ reportPath, ...report }, null, 2));
