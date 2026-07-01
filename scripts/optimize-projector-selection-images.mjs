import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const selectionRoot = path.join(repoRoot, "apps", "web", "public", "exhibits", "projector-selection");
const sourceDirName = "source";
const optimizedDirName = "optimized";
const supportedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]);
const maxEdge = Number.parseInt(process.env.PROJECTOR_IMAGE_MAX_EDGE ?? "1280", 10);
const quality = Number.parseInt(process.env.PROJECTOR_IMAGE_QUALITY ?? "78", 10);

if (!ffmpegPath) {
  throw new Error("ffmpeg-static did not resolve an ffmpeg binary");
}

function isSupportedImage(fileName) {
  return supportedExtensions.has(path.extname(fileName).toLowerCase());
}

function outputFileName(fileName) {
  return `${path.basename(fileName, path.extname(fileName))}.webp`;
}

function runFfmpeg(inputPath, outputPath) {
  const scaleFilter = `scale='if(gte(iw,ih),min(${maxEdge},iw),-2)':'if(gte(iw,ih),-2,min(${maxEdge},ih))'`;
  const args = [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-vf",
    scaleFilter,
    "-c:v",
    "libwebp",
    "-quality",
    String(quality),
    "-compression_level",
    "5",
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}: ${inputPath}`));
    });
  });
}

async function optimizeExhibitDirectory(exhibitDir) {
  const sourceDir = path.join(selectionRoot, exhibitDir, sourceDirName);
  const optimizedDir = path.join(selectionRoot, exhibitDir, optimizedDirName);
  let sourceEntries;
  try {
    sourceEntries = await readdir(sourceDir, { withFileTypes: true });
  } catch {
    return [];
  }

  await mkdir(optimizedDir, { recursive: true });
  const outputs = [];
  for (const entry of sourceEntries) {
    if (!entry.isFile() || !isSupportedImage(entry.name)) continue;
    const inputPath = path.join(sourceDir, entry.name);
    const outputPath = path.join(optimizedDir, outputFileName(entry.name));
    await runFfmpeg(inputPath, outputPath);
    outputs.push(path.relative(repoRoot, outputPath));
  }
  return outputs;
}

const exhibitEntries = await readdir(selectionRoot, { withFileTypes: true });
const outputs = [];
for (const entry of exhibitEntries) {
  if (!entry.isDirectory()) continue;
  outputs.push(...(await optimizeExhibitDirectory(entry.name)));
}

if (outputs.length === 0) {
  console.log("No projector source images found.");
} else {
  console.log(`Optimized ${outputs.length} projector image(s):`);
  for (const output of outputs) console.log(`- ${output}`);
}
