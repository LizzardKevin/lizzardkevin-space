import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const help = `Usage:
  node scripts/prepare-exhibit-models.mjs apps/web/public/exhibits/work_001/work_001.source.glb --force

Input naming:
  public/exhibits/work_001/work_001.source.glb

Outputs:
  space_work_001.glb   <= 50k triangles
  focus_work_001.glb   <= 150k triangles
  work_001.report.json

This script uses Blender Decimate. Set BLENDER to an explicit executable path
when Blender is not on PATH.`;

if (process.argv.includes("--help") || process.argv.length < 3) {
  console.log(help);
  process.exit(process.argv.includes("--help") ? 0 : 1);
}

const sourcePath = path.resolve(process.argv[2]);
if (!fs.existsSync(sourcePath)) {
  throw new Error(`Source GLB not found: ${sourcePath}`);
}

const force = process.argv.includes("--force");
const dir = path.dirname(sourcePath);
const sourceName = path.basename(sourcePath);
const exhibitId = sourceName.replace(/\.source\.glb$/i, "");
if (exhibitId === sourceName) {
  throw new Error("Source file must use <exhibitId>.source.glb naming");
}

function executableRuns(command) {
  const result = spawnSync(command, ["--version"], { encoding: "utf8", windowsHide: true });
  return result.status === 0;
}

function findOnPath(commandName) {
  const finder = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(finder, [commandName], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) return null;
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? null;
}

function findBlenderExecutable() {
  if (process.env.BLENDER) {
    if (fs.existsSync(process.env.BLENDER) || executableRuns(process.env.BLENDER)) {
      return process.env.BLENDER;
    }
  }

  const candidates = [
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

  return findOnPath("blender");
}

for (const outputName of [`space_${exhibitId}.glb`, `focus_${exhibitId}.glb`]) {
  const outputPath = path.join(dir, outputName);
  if (!force && fs.existsSync(outputPath)) {
    throw new Error(`${outputPath} already exists. Pass --force to overwrite.`);
  }
}

const blender = findBlenderExecutable();
if (!blender) {
  throw new Error("Blender executable not found. Set BLENDER to the Blender executable path.");
}

const blenderScript = path.resolve("scripts/prepare-exhibit-models-blender.py");
const result = spawnSync(
  blender,
  ["--background", "--python", blenderScript, "--", sourcePath, exhibitId, dir],
  { encoding: "utf8", windowsHide: true },
);
if (result.status !== 0) {
  throw new Error(result.stderr || result.stdout || `Blender exited with ${result.status}`);
}

const marker = "MODEL_REPORT_JSON=";
const line = result.stdout.split(/\r?\n/).find((item) => item.startsWith(marker));
if (!line) {
  throw new Error(`Blender exhibit model script did not print ${marker}`);
}

const report = JSON.parse(line.slice(marker.length));
const reportPath = path.join(dir, `${exhibitId}.report.json`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ reportPath, ...report }, null, 2));
