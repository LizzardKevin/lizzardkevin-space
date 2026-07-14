#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
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

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
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

export function readGlbMetadata(path) {
  const fd = openSync(path, "r");
  try {
    const header = Buffer.alloc(20);
    if (readSync(fd, header, 0, header.length, 0) !== header.length || header.readUInt32LE(0) !== GLB_MAGIC) {
      return { valid: false, error: "not-glb" };
    }
    const jsonLength = header.readUInt32LE(12);
    const chunkType = header.readUInt32LE(16);
    if (chunkType !== GLB_JSON_CHUNK || jsonLength <= 0) return { valid: false, error: "missing-json-chunk" };
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
  if (extname(path).toLowerCase() === ".glb") item.glb = readGlbMetadata(path);
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
  return Object.fromEntries(Object.entries(groups).sort(([left], [right]) => left.localeCompare(right)));
}

function parseBuildEntrypoints(distRoot, repoRoot) {
  const indexPath = resolve(distRoot, "index.html");
  if (!existsSync(indexPath)) return [];
  const html = readFileSync(indexPath, "utf8");
  return [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((path) => path.includes("/assets/") || path.startsWith("./assets/"))
    .map((path) => portablePath(repoRoot, resolve(distRoot, path.replace(/^\.\//, ""))))
    .sort();
}

export async function createAssetInventory({ repoRoot = defaultRepoRoot } = {}) {
  const normalizedRoot = resolve(repoRoot);
  const discoveryRoots = ["apps/web/public", "BlenderFile", "docs/assets"]
    .map((path) => resolve(normalizedRoot, path))
    .filter(existsSync);
  const assets = discoveryRoots
    .flatMap(walk)
    .filter((path) => portablePath(normalizedRoot, path).startsWith("apps/web/public/")
      || ASSET_EXTENSIONS.has(extname(path).toLowerCase()))
    .sort((left, right) => portablePath(normalizedRoot, left).localeCompare(portablePath(normalizedRoot, right)))
    .map((path) => inventoryAsset(normalizedRoot, path));

  const distRoot = resolve(normalizedRoot, "apps/web/dist");
  const buildPaths = existsSync(distRoot)
    ? [resolve(distRoot, "index.html"), ...walk(resolve(distRoot, "assets"))].filter(existsSync)
    : [];
  const buildFiles = buildPaths
    .sort((left, right) => portablePath(normalizedRoot, left).localeCompare(portablePath(normalizedRoot, right)))
    .map((path) => inventoryBuildFile(normalizedRoot, path));

  return {
    schemaVersion: 1,
    scope: {
      discoveryRoots: discoveryRoots.map((path) => portablePath(normalizedRoot, path)),
      publicDirectoryShipsVerbatim: true,
      browserMeasurements: "pending_browser_capture",
    },
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
      byPhase: totalsBy(assets, "phase"),
      byType: totalsBy(assets, "type"),
    },
    assets,
    build: {
      available: existsSync(distRoot),
      manifest: existsSync(resolve(distRoot, ".vite/manifest.json"))
        ? portablePath(normalizedRoot, resolve(distRoot, ".vite/manifest.json"))
        : null,
      entrypoints: parseBuildEntrypoints(distRoot, normalizedRoot),
      files: buildFiles,
      totals: {
        files: buildFiles.length,
        bytes: buildFiles.reduce((sum, item) => sum + item.bytes, 0),
        gzipBytes: buildFiles.reduce((sum, item) => sum + (item.gzipBytes ?? 0), 0),
        byPhase: totalsBy(buildFiles, "phase"),
      },
    },
  };
}

export function serializeInventory(inventory) {
  return `${JSON.stringify(inventory, null, 2)}\n`;
}

async function main(args) {
  const inventory = await createAssetInventory();
  const serialized = serializeInventory(inventory);
  const checkIndex = args.indexOf("--check");
  const outputIndex = args.indexOf("--output");
  if (checkIndex >= 0) {
    const reportPath = args[checkIndex + 1];
    if (!reportPath) throw new Error("--check requires a report path");
    const expected = readFileSync(resolve(reportPath), "utf8").replace(/\r\n/g, "\n");
    if (expected !== serialized) {
      process.stderr.write(`Asset inventory differs from ${reportPath}. Regenerate after a verified build.\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`Asset inventory matches ${reportPath}.\n`);
    return;
  }
  if (outputIndex >= 0) {
    const reportPath = args[outputIndex + 1];
    if (!reportPath) throw new Error("--output requires a report path");
    const absolutePath = resolve(reportPath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, serialized, "utf8");
    process.stdout.write(`Wrote ${portablePath(defaultRepoRoot, absolutePath)}.\n`);
    return;
  }
  process.stdout.write(serialized);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
