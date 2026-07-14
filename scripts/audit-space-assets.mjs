#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const defaultRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APPROVED_REPORT_PATH = "docs/performance/space-asset-inventory.json";
const GLB_MAGIC = 0x46546c67;
const GLB_JSON_CHUNK = 0x4e4f534a;
const ASSET_EXTENSIONS = new Set([
  ".avif", ".bin", ".blend", ".blend1", ".csv", ".exr", ".flac", ".glb", ".gltf",
  ".hdr", ".jpeg", ".jpg", ".json", ".ktx", ".ktx2", ".m4a", ".mp3", ".mp4",
  ".ogg", ".png", ".svg", ".wasm", ".wav", ".webm", ".webp", ".woff", ".woff2",
  ".xls", ".xlsm", ".xlsx",
]);
const TEXT_BUILD_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".svg"]);
const ACCESSOR_COMPONENT_BYTES = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const ACCESSOR_TYPE_COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

function portablePath(root, path) {
  return relative(root, path).replaceAll("\\", "/");
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    const status = lstatSync(path);
    if (status.isSymbolicLink()) throw new Error(`Symbolic link/reparse point is not allowed in asset inventory: ${path}`);
    return status.isDirectory() ? walk(path) : [path];
  });
}

function assertNoSymlinkComponents(root, target) {
  let current = resolve(root);
  if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
    throw new Error(`Symbolic link/reparse point is not allowed for report output: ${current}`);
  }
  const parts = portablePath(current, target).split("/").filter(Boolean);
  for (const part of parts) {
    current = resolve(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
      throw new Error(`Symbolic link/reparse point is not allowed for report output: ${current}`);
    }
  }
}

export function resolveApprovedReportOutput({ repoRoot = defaultRepoRoot, candidate }) {
  const normalizedRoot = resolve(repoRoot);
  const approved = resolve(normalizedRoot, APPROVED_REPORT_PATH);
  const requested = resolve(normalizedRoot, candidate ?? "");
  const equal = process.platform === "win32"
    ? requested.toLowerCase() === approved.toLowerCase()
    : requested === approved;
  if (!equal) throw new Error(`--output is restricted to the approved report path: ${APPROVED_REPORT_PATH}`);
  assertNoSymlinkComponents(normalizedRoot, approved);
  return approved;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function assetType(path) {
  const ext = extname(path).toLowerCase();
  if ([".glb", ".gltf", ".blend", ".blend1", ".bin"].includes(ext)) return "3d";
  if ([".jpg", ".jpeg", ".png", ".webp", ".avif", ".ktx", ".ktx2", ".hdr", ".exr"].includes(ext)) return "texture/image";
  if ([".mp3", ".wav", ".ogg", ".m4a", ".flac"].includes(ext)) return "audio";
  if ([".mp4", ".webm"].includes(ext)) return "video";
  if ([".woff", ".woff2"].includes(ext)) return "font";
  if (ext === ".wasm") return "wasm";
  if (ext === ".js") return "javascript/decoder";
  if ([".md", ".txt"].includes(ext)) return "documentation/license";
  if ([".xlsx", ".xls", ".xlsm", ".csv"].includes(ext)) return "workbook/data-source";
  if ([".json", ".svg"].includes(ext)) return "data/interface";
  return ext.slice(1) || "other";
}

function isSemanticSourceOnly(path) {
  const lower = path.toLowerCase();
  return lower.startsWith("blenderfile/")
    || lower.startsWith("docs/assets/")
    || lower.endsWith(".blend")
    || lower.endsWith(".blend1")
    || lower.endsWith(".source.glb")
    || lower.includes("/projector-selection/") && lower.includes("/source/")
    || lower.endsWith(".report.json");
}

function inferPhase(path) {
  const lower = path.toLowerCase();
  if (isSemanticSourceOnly(path)) return "source-only";
  if (lower.includes("rapier-vendor")) return "rapier/build-chunk";
  if (lower.includes("three-vendor") || lower.includes("spacehost")) return "boot/world";
  if (lower.includes("focus") || /\/exhibits\/[^/]+\/(?:img|video)\//.test(lower) || /\/exhibits\/[^/]+\/content\.json$/.test(lower)) return "focus/work";
  if (lower.includes("/audio/") || /\/exhibits\/[^/]+\/[^/]+\.mp3$/.test(lower)) return "audio";
  if (lower.includes("/draco/")) return "decoder";
  if (lower.includes("/models/") || lower.includes("/onboarding/") || lower.includes("space_") || lower.includes("projector-selection")) return "boot/world";
  if (lower.includes("mobileapp") || lower.includes("/fonts/") || lower.endsWith("favicon.svg") || lower.endsWith("icons.svg")) return "mobile/cold";
  if (lower.includes("desktopapp") || lower.includes("appRoutes".toLowerCase()) || lower.includes("react-vendor") || /\/assets\/index-/.test(lower)) return "shared/app-shell";
  return "shared/other";
}

function imageDimensions(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) return null;
  const pixels = width * height;
  if (!Number.isSafeInteger(pixels) || !Number.isSafeInteger(pixels * 4)) return null;
  return { width, height, pixels, estimatedRgba8Bytes: pixels * 4 };
}

function readPngDimensions(buffer) {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return null;
  return imageDimensions(buffer.readUInt32BE(16), buffer.readUInt32BE(20));
}

function readJpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 1 < buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) break;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) return null;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) return null;
    if (startOfFrameMarkers.has(marker)) {
      if (segmentLength < 7) return null;
      return imageDimensions(buffer.readUInt16BE(offset + 5), buffer.readUInt16BE(offset + 3));
    }
    offset += segmentLength;
  }
  return null;
}

function readWebpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return imageDimensions(buffer.readUIntLE(24, 3) + 1, buffer.readUIntLE(27, 3) + 1);
  }
  if (chunk === "VP8 " && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
    return imageDimensions(buffer.readUInt16LE(26) & 0x3fff, buffer.readUInt16LE(28) & 0x3fff);
  }
  if (chunk === "VP8L" && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21);
    return imageDimensions((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  return null;
}

export function readImageMetadataFromBuffer(buffer, extension) {
  const ext = extension.toLowerCase();
  if (ext === ".png") return readPngDimensions(buffer);
  if (ext === ".jpg" || ext === ".jpeg") return readJpegDimensions(buffer);
  if (ext === ".webp") return readWebpDimensions(buffer);
  return null;
}

export function readGlbMetadata(path) {
  const fileBytes = statSync(path).size;
  const fd = openSync(path, "r");
  try {
    const header = Buffer.alloc(20);
    if (readSync(fd, header, 0, header.length, 0) !== header.length || header.readUInt32LE(0) !== GLB_MAGIC) {
      return { valid: false, error: "not-glb" };
    }
    if (header.readUInt32LE(4) !== 2) return { valid: false, error: "unsupported-version" };
    if (header.readUInt32LE(8) !== fileBytes) return { valid: false, error: "declared-length-mismatch" };
    const jsonLength = header.readUInt32LE(12);
    const chunkType = header.readUInt32LE(16);
    if (chunkType !== GLB_JSON_CHUNK || jsonLength <= 0) return { valid: false, error: "missing-json-chunk" };
    if (jsonLength > fileBytes - 20) return { valid: false, error: "json-chunk-out-of-bounds" };
    const jsonBuffer = Buffer.alloc(jsonLength);
    if (readSync(fd, jsonBuffer, 0, jsonLength, 20) !== jsonLength) return { valid: false, error: "truncated-json-chunk" };
    const document = JSON.parse(jsonBuffer.toString("utf8").replace(/\u0000+$/g, "").trimEnd());
    const extensionsUsed = [...(document.extensionsUsed ?? [])].sort();
    const imageBufferBytes = (document.images ?? []).reduce((total, image) => {
      const bufferView = Number.isInteger(image.bufferView) ? document.bufferViews?.[image.bufferView] : null;
      return total + (bufferView?.byteLength ?? 0);
    }, 0);
    const accessorLogicalBytes = (document.accessors ?? []).reduce((total, accessor) => {
      const componentBytes = ACCESSOR_COMPONENT_BYTES[accessor.componentType] ?? 0;
      const components = ACCESSOR_TYPE_COMPONENTS[accessor.type] ?? 0;
      return total + (accessor.count ?? 0) * componentBytes * components;
    }, 0);
    const collisionNamedNodes = (document.nodes ?? []).filter((node) => /(?:collider|collision|^col[_-])/i.test(node.name ?? "")).length;
    return {
      valid: true,
      version: header.readUInt32LE(4),
      declaredBytes: header.readUInt32LE(8),
      generator: document.asset?.generator ?? null,
      scenes: document.scenes?.length ?? 0,
      nodes: document.nodes?.length ?? 0,
      meshes: document.meshes?.length ?? 0,
      primitives: (document.meshes ?? []).reduce((total, mesh) => total + (mesh.primitives?.length ?? 0), 0),
      materials: document.materials?.length ?? 0,
      textures: document.textures?.length ?? 0,
      images: document.images?.length ?? 0,
      imageBufferBytes,
      bufferBytes: (document.buffers ?? []).reduce((total, buffer) => total + (buffer.byteLength ?? 0), 0),
      bufferViewBytes: (document.bufferViews ?? []).reduce((total, bufferView) => total + (bufferView.byteLength ?? 0), 0),
      accessors: document.accessors?.length ?? 0,
      accessorLogicalBytes,
      collisionNamedNodes,
      extensionsUsed,
      compression: {
        draco: extensionsUsed.includes("KHR_draco_mesh_compression"),
        meshopt: extensionsUsed.includes("EXT_meshopt_compression"),
        ktx2: extensionsUsed.includes("KHR_texture_basisu"),
      },
    };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.name : "unknown-error" };
  } finally {
    closeSync(fd);
  }
}

function inventoryAsset(repoRoot, path) {
  const repoPath = portablePath(repoRoot, path);
  const publicAsset = repoPath.startsWith("apps/web/public/");
  const sourceOnly = isSemanticSourceOnly(repoPath);
  const item = {
    path: repoPath,
    type: assetType(repoPath),
    phase: inferPhase(repoPath),
    bytes: statSync(path).size,
    sha256: sha256(path),
    public: publicAsset,
    sourceOnly,
    shipping: publicAsset,
    exclusionCandidate: publicAsset && sourceOnly,
  };
  const extension = extname(path).toLowerCase();
  if (extension === ".glb") item.glb = readGlbMetadata(path);
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(extension)) {
    const image = readImageMetadataFromBuffer(readFileSync(path), extension);
    if (!image) throw new Error(`Unsupported or invalid ${extension} image header: ${repoPath}`);
    item.image = image;
  }
  return item;
}

function inventoryBuildFile(repoRoot, path) {
  const buffer = readFileSync(path);
  const ext = extname(path).toLowerCase();
  return {
    path: portablePath(repoRoot, path),
    type: ext === ".js" ? "javascript" : ext === ".css" ? "stylesheet" : assetType(path),
    phase: inferPhase(portablePath(repoRoot, path)),
    bytes: buffer.byteLength,
    gzipBytes: TEXT_BUILD_EXTENSIONS.has(ext) ? gzipSync(buffer, { level: 9, mtime: 0 }).byteLength : null,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

function totalsBy(items, key) {
  const groups = {};
  for (const item of items) {
    const label = item[key];
    const group = groups[label] ?? { files: 0, bytes: 0 };
    group.files += 1;
    group.bytes += item.bytes;
    groups[label] = group;
  }
  return Object.fromEntries(Object.entries(groups).sort(([left], [right]) => compareText(left, right)));
}

function imageExposureTotals(assets) {
  const images = assets.filter((asset) => asset.image);
  return {
    files: images.length,
    pixels: images.reduce((sum, asset) => sum + asset.image.pixels, 0),
    estimatedRgba8Bytes: images.reduce((sum, asset) => sum + asset.image.estimatedRgba8Bytes, 0),
    qualification: "width*height*4 logical RGBA8 only; excludes mipmaps, GPU compression, alignment, and extra decoded/upload copies",
  };
}

function imageExposureByPhase(assets) {
  const groups = {};
  for (const asset of assets.filter((item) => item.image)) {
    const group = groups[asset.phase] ?? { files: 0, pixels: 0, estimatedRgba8Bytes: 0 };
    group.files += 1;
    group.pixels += asset.image.pixels;
    group.estimatedRgba8Bytes += asset.image.estimatedRgba8Bytes;
    groups[asset.phase] = group;
  }
  return Object.fromEntries(Object.entries(groups).sort(([left], [right]) => compareText(left, right)));
}

function parseBuildEntrypoints(distRoot, repoRoot) {
  const indexPath = resolve(distRoot, "index.html");
  if (!existsSync(indexPath)) return [];
  const html = readFileSync(indexPath, "utf8");
  return [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((path) => path.includes("/assets/") || path.startsWith("./assets/"))
    .map((path) => portablePath(repoRoot, resolve(distRoot, path.replace(/^\.\//, ""))))
    .sort(compareText);
}

export function createSourceAssetInventory({ repoRoot = defaultRepoRoot } = {}) {
  const normalizedRoot = resolve(repoRoot);
  const discoveryRoots = ["apps/web/public", "BlenderFile", "docs/assets"]
    .map((path) => resolve(normalizedRoot, path))
    .filter(existsSync);
  const assets = discoveryRoots
    .flatMap(walk)
    .filter((path) => portablePath(normalizedRoot, path).startsWith("apps/web/public/")
      || ASSET_EXTENSIONS.has(extname(path).toLowerCase()))
    .sort((left, right) => compareText(portablePath(normalizedRoot, left), portablePath(normalizedRoot, right)))
    .map((path) => inventoryAsset(normalizedRoot, path));
  const imageAssets = assets.filter((asset) => asset.image);
  return {
    discoveryRoots: discoveryRoots.map((path) => portablePath(normalizedRoot, path)),
    assets,
    totals: {
      assets: { files: assets.length, bytes: assets.reduce((sum, item) => sum + item.bytes, 0) },
      publicShipping: {
        files: assets.filter((item) => item.shipping).length,
        bytes: assets.filter((item) => item.shipping).reduce((sum, item) => sum + item.bytes, 0),
      },
      sourceOnly: {
        files: assets.filter((item) => item.sourceOnly).length,
        bytes: assets.filter((item) => item.sourceOnly).reduce((sum, item) => sum + item.bytes, 0),
      },
      imageDecodedExposure: imageExposureTotals(assets),
      imageDecodedExposureByPhase: imageExposureByPhase(assets),
      largestImages: [...imageAssets]
        .sort((left, right) => right.image.estimatedRgba8Bytes - left.image.estimatedRgba8Bytes || compareText(left.path, right.path))
        .slice(0, 10)
        .map((asset) => ({ path: asset.path, ...asset.image })),
      byPhase: totalsBy(assets, "phase"),
      byType: totalsBy(assets, "type"),
    },
  };
}

export function createBuildEvidence({ repoRoot = defaultRepoRoot, distRoot } = {}) {
  const normalizedRoot = resolve(repoRoot);
  const normalizedDistRoot = resolve(distRoot ?? resolve(normalizedRoot, "apps/web/dist"));
  const indexPath = resolve(normalizedDistRoot, "index.html");
  const assetsRoot = resolve(normalizedDistRoot, "assets");
  if (!existsSync(indexPath) || !existsSync(assetsRoot)) {
    throw new Error("Build evidence is required for the full SPACE asset report. Run npm run build:chunks first.");
  }
  const buildPaths = [indexPath, ...walk(assetsRoot)];
  const buildFiles = buildPaths
    .sort((left, right) => compareText(portablePath(normalizedRoot, left), portablePath(normalizedRoot, right)))
    .map((path) => inventoryBuildFile(normalizedRoot, path));
  const manifestPath = resolve(normalizedDistRoot, ".vite/manifest.json");
  const manifest = existsSync(manifestPath)
    ? {
        path: portablePath(normalizedRoot, manifestPath),
        entries: Object.keys(JSON.parse(readFileSync(manifestPath, "utf8"))).sort(compareText),
      }
    : null;
  return {
    available: true,
    manifest,
    entrypoints: parseBuildEntrypoints(normalizedDistRoot, normalizedRoot),
    files: buildFiles,
    totals: {
      files: buildFiles.length,
      bytes: buildFiles.reduce((sum, item) => sum + item.bytes, 0),
      gzipBytes: buildFiles.reduce((sum, item) => sum + (item.gzipBytes ?? 0), 0),
      byPhase: totalsBy(buildFiles, "phase"),
    },
  };
}

export async function createAssetInventory({ repoRoot = defaultRepoRoot, distRoot } = {}) {
  const normalizedRoot = resolve(repoRoot);
  const source = createSourceAssetInventory({ repoRoot: normalizedRoot });
  const build = createBuildEvidence({ repoRoot: normalizedRoot, distRoot });

  return {
    schemaVersion: 2,
    scope: {
      discoveryRoots: source.discoveryRoots,
      publicDirectoryShipsVerbatim: true,
      browserMeasurements: "pending_browser_capture",
    },
    totals: source.totals,
    assets: source.assets,
    build,
  };
}

export function serializeInventory(inventory) {
  return `${JSON.stringify(inventory, null, 2)}\n`;
}

async function main(args) {
  const checkIndex = args.indexOf("--check");
  const outputIndex = args.indexOf("--output");
  if (checkIndex >= 0 && outputIndex >= 0) throw new Error("Use only one of --check or --output");
  let approvedOutput = null;
  if (outputIndex >= 0) {
    const reportPath = args[outputIndex + 1];
    if (!reportPath) throw new Error("--output requires a report path");
    approvedOutput = resolveApprovedReportOutput({ repoRoot: defaultRepoRoot, candidate: reportPath });
  }
  const inventory = await createAssetInventory();
  const serialized = serializeInventory(inventory);
  if (checkIndex >= 0) {
    const reportPath = args[checkIndex + 1];
    if (!reportPath) throw new Error("--check requires a report path");
    const expected = readFileSync(resolve(defaultRepoRoot, reportPath), "utf8").replace(/\r\n/g, "\n");
    if (expected !== serialized) {
      process.stderr.write(`Asset inventory differs from ${reportPath}. Regenerate after a verified build.\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`Asset inventory matches ${reportPath}.\n`);
    return;
  }
  if (outputIndex >= 0) {
    mkdirSync(dirname(approvedOutput), { recursive: true });
    writeFileSync(approvedOutput, serialized, "utf8");
    process.stdout.write(`Wrote ${portablePath(defaultRepoRoot, approvedOutput)}.\n`);
    return;
  }
  process.stdout.write(serialized);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
