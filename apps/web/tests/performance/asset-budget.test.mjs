import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, extname, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const sourceRoot = resolve(repoRoot, "apps/web/src");
const auditScript = resolve(repoRoot, "scripts/audit-space-assets.mjs");
const committedReport = resolve(repoRoot, "docs/performance/space-asset-inventory.json");
const packageJsonPath = resolve(repoRoot, "package.json");

function digest(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function protectedAssetSnapshot() {
  const roots = ["apps/web/public", "BlenderFile", "docs/assets"]
    .map((path) => resolve(repoRoot, path))
    .filter(existsSync);
  return Object.fromEntries(
    roots
      .flatMap(walk)
      .sort()
      .map((path) => [relative(repoRoot, path).replaceAll("\\", "/"), `${statSync(path).size}:${digest(path)}`]),
  );
}

function staticSpecifiers(source) {
  const patterns = [
    /^\s*import\s+(?!type\b)(?:["']([^"']+)["']|[\s\S]*?\sfrom\s+["']([^"']+)["'])\s*;?/gm,
    /^\s*export\s+(?:\*(?:\s+as\s+[\w$]+)?|\{[\s\S]*?\})\s+from\s+["']([^"']+)["']\s*;?/gm,
  ];
  return patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1] ?? match[2]));
}

function resolveModule(importer, specifier) {
  const base = resolve(dirname(importer), specifier);
  const candidates = extname(base)
    ? [base]
    : [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, resolve(base, "index.ts"), resolve(base, "index.tsx")];
  return candidates.find(existsSync);
}

function collectStaticGraph(entry) {
  const pending = [resolve(sourceRoot, entry)];
  const visited = new Set();
  const packageImports = [];
  while (pending.length) {
    const path = pending.pop();
    if (!path || visited.has(path)) continue;
    visited.add(path);
    const source = readFileSync(path, "utf8");
    for (const specifier of staticSpecifiers(source)) {
      if (specifier.startsWith(".")) {
        const target = resolveModule(path, specifier);
        assert(target, `${specifier} from ${relative(sourceRoot, path)} must resolve`);
        pending.push(target);
      } else {
        packageImports.push(specifier);
      }
    }
  }
  return { files: [...visited], packageImports };
}

test("asset audit is deterministic, content-addressed, and matches real files", async () => {
  assert(existsSync(auditScript), "scripts/audit-space-assets.mjs must exist");
  const { createAssetInventory } = await import(pathToFileURL(auditScript).href);
  const first = await createAssetInventory({ repoRoot });
  const second = await createAssetInventory({ repoRoot });
  assert.deepEqual(second, first);
  assert.equal(first.schemaVersion, 2);
  assert(first.assets.length > 0);
  assert(first.build.files.some((asset) => asset.path.includes("rapier-vendor")));
  for (const asset of [...first.assets, ...first.build.files]) {
    assert(!asset.path.includes("\\"), `${asset.path} must use portable separators`);
    assert(!asset.path.includes(repoRoot), `${asset.path} must be repository-relative`);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
    const path = resolve(repoRoot, asset.path);
    assert.equal(asset.bytes, statSync(path).size, `${asset.path} byte count must match disk`);
    assert.equal(asset.sha256, digest(path), `${asset.path} hash must match disk`);
  }
  for (const asset of first.assets.filter((item) => item.glb?.valid)) {
    assert(Number.isInteger(asset.glb.accessorLogicalBytes) && asset.glb.accessorLogicalBytes >= 0);
    assert(Number.isInteger(asset.glb.bufferBytes) && asset.glb.bufferBytes >= 0);
  }
});

test("full inventory fails actionably when build evidence is absent", async () => {
  const { createBuildEvidence } = await import(pathToFileURL(auditScript).href);
  const emptyRoot = mkdtempSync(resolve(tmpdir(), "space-missing-dist-"));
  try {
    assert.throws(
      () => createBuildEvidence({ repoRoot: emptyRoot }),
      /Build evidence is required.*npm run build:chunks/i,
    );
  } finally {
    rmSync(emptyRoot, { recursive: true, force: true });
  }
});

test("report output is restricted to the approved repository evidence path", async () => {
  const { resolveApprovedReportOutput } = await import(pathToFileURL(auditScript).href);
  assert.equal(
    resolveApprovedReportOutput({ repoRoot, candidate: "docs/performance/space-asset-inventory.json" }),
    committedReport,
  );
  const outside = resolve(tmpdir(), "space-assets-outside.json");
  for (const candidate of [
    "../../outside.json",
    outside,
    "apps/web/public/models/space_main.glb",
    "apps/web/src/generated/space-asset-inventory.json",
    "docs/assets/space-asset-inventory.json",
  ]) {
    assert.throws(() => resolveApprovedReportOutput({ repoRoot, candidate }), /approved report path/i, candidate);
  }
});

test("report output rejects symlinked targets and parent directories", async () => {
  const { resolveApprovedReportOutput } = await import(pathToFileURL(auditScript).href);
  const temp = mkdtempSync(resolve(tmpdir(), "space-output-link-"));
  const outside = resolve(temp, "outside");
  const fakeRoot = resolve(temp, "repo");
  const targetLinkRoot = resolve(temp, "target-link-repo");
  mkdirSync(outside, { recursive: true });
  mkdirSync(fakeRoot, { recursive: true });
  mkdirSync(resolve(targetLinkRoot, "docs/performance"), { recursive: true });
  try {
    symlinkSync(outside, resolve(fakeRoot, "docs"), "junction");
    assert.throws(
      () => resolveApprovedReportOutput({ repoRoot: fakeRoot, candidate: "docs/performance/space-asset-inventory.json" }),
      /symbolic link|reparse/i,
    );
    symlinkSync(outside, resolve(targetLinkRoot, "docs/performance/space-asset-inventory.json"), "junction");
    assert.throws(
      () => resolveApprovedReportOutput({ repoRoot: targetLinkRoot, candidate: "docs/performance/space-asset-inventory.json" }),
      /symbolic link|reparse/i,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("CLI output rejects unsafe destinations without creating them", () => {
  const outside = resolve(tmpdir(), `space-inventory-${process.pid}.json`);
  rmSync(outside, { force: true });
  for (const candidate of [outside, "apps/web/public/unsafe-inventory.json", "apps/web/src/generated/inventory.json"]) {
    const result = spawnSync(process.execPath, [auditScript, "--output", candidate], { cwd: repoRoot, encoding: "utf8" });
    assert.notEqual(result.status, 0, candidate);
    assert.match(result.stderr, /approved report path/i);
  }
  assert.equal(existsSync(outside), false);
});

test("PNG, JPEG, and WebP headers expose qualified RGBA8 estimates", async () => {
  const { readImageMetadataFromBuffer } = await import(pathToFileURL(auditScript).href);
  const png = Buffer.alloc(24);
  Buffer.from("89504e470d0a1a0a", "hex").copy(png);
  png.writeUInt32BE(320, 16);
  png.writeUInt32BE(180, 20);
  const jpeg = Buffer.from("ffd8ffc00011080010002003011100021100031100ffd9", "hex");
  const webp = Buffer.alloc(30);
  webp.write("RIFF", 0, "ascii");
  webp.write("WEBP", 8, "ascii");
  webp.write("VP8X", 12, "ascii");
  webp.writeUInt32LE(10, 16);
  webp.writeUIntLE(299, 24, 3);
  webp.writeUIntLE(199, 27, 3);
  for (const [buffer, extension, width, height] of [
    [png, ".png", 320, 180],
    [jpeg, ".jpg", 32, 16],
    [webp, ".webp", 300, 200],
  ]) {
    assert.deepEqual(readImageMetadataFromBuffer(buffer, extension), {
      width,
      height,
      pixels: width * height,
      estimatedRgba8Bytes: width * height * 4,
    });
  }
});

test("actual raster assets include dimensions and decoded exposure aggregates", async () => {
  const { createAssetInventory } = await import(pathToFileURL(auditScript).href);
  const inventory = await createAssetInventory({ repoRoot });
  const rasterAssets = inventory.assets.filter((asset) => [".png", ".jpg", ".jpeg", ".webp"].includes(extname(asset.path).toLowerCase()));
  assert(rasterAssets.length > 0);
  for (const asset of rasterAssets) {
    assert(asset.image?.width > 0 && asset.image?.height > 0, asset.path);
    assert.equal(asset.image.pixels, asset.image.width * asset.image.height);
    assert.equal(asset.image.estimatedRgba8Bytes, asset.image.pixels * 4);
  }
  assert.equal(inventory.totals.imageDecodedExposure.files, rasterAssets.length);
  assert.equal(
    inventory.totals.imageDecodedExposure.estimatedRgba8Bytes,
    rasterAssets.reduce((sum, asset) => sum + asset.image.estimatedRgba8Bytes, 0),
  );
  assert(inventory.totals.largestImages.length > 0);
});

test("GLB parsing rejects unsupported versions and impossible chunk bounds before allocation", async () => {
  const { readGlbMetadata } = await import(pathToFileURL(auditScript).href);
  const temp = mkdtempSync(resolve(tmpdir(), "space-invalid-glb-"));
  const writeGlb = (name, { version = 2, declaredBytes = 20, jsonBytes = 0 }) => {
    const path = resolve(temp, name);
    const buffer = Buffer.alloc(20);
    buffer.writeUInt32LE(0x46546c67, 0);
    buffer.writeUInt32LE(version, 4);
    buffer.writeUInt32LE(declaredBytes, 8);
    buffer.writeUInt32LE(jsonBytes, 12);
    buffer.writeUInt32LE(0x4e4f534a, 16);
    writeFileSync(path, buffer);
    return path;
  };
  try {
    assert.deepEqual(readGlbMetadata(writeGlb("v1.glb", { version: 1 })), { valid: false, error: "unsupported-version" });
    assert.deepEqual(readGlbMetadata(writeGlb("length.glb", { declaredBytes: 200 })), { valid: false, error: "declared-length-mismatch" });
    assert.deepEqual(readGlbMetadata(writeGlb("bounds.glb", { jsonBytes: 0xfffffff0 })), { valid: false, error: "json-chunk-out-of-bounds" });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("release scripts build before checking the report without recursive build", () => {
  const scripts = JSON.parse(readFileSync(packageJsonPath, "utf8")).scripts;
  const webScripts = JSON.parse(readFileSync(resolve(repoRoot, "apps/web/package.json"), "utf8")).scripts;
  assert.equal(scripts["test:asset-budget"], "node --test apps/web/tests/performance/asset-budget.test.mjs");
  const directReadOnlyBuild = "npm run content:check && npm run build -w apps/web && node apps/web/tests/build/chunks.contract-test.mjs";
  assert.match(scripts["asset:audit"], new RegExp(`^${directReadOnlyBuild.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} && node scripts/audit-space-assets\\.mjs --output `));
  assert.match(scripts["asset:check"], new RegExp(`^${directReadOnlyBuild.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} && node scripts/audit-space-assets\\.mjs --check [^&]+ && npm run test:asset-budget$`));
  assert.match(scripts["verify:release"], /npm run verify:release:protected/);
  assert.doesNotMatch(scripts["asset:check"], /verify:release|asset:check|content:generate|exhibits:cache|build:chunks/);
  assert.equal(webScripts.build, "tsc -b && vite build");
  assert.equal(webScripts.prebuild, undefined);
  assert.equal(scripts["test:asset-readonly"], "node --test apps/web/tests/performance/asset-readonly.integration-test.mjs");
});

test("semantic source assets remain inventoried and current public shipping is reported truthfully", async () => {
  const { createAssetInventory } = await import(pathToFileURL(auditScript).href);
  const inventory = await createAssetInventory({ repoRoot });
  const publicSource = inventory.assets.find((asset) => asset.path.endsWith(".source.glb"));
  assert(publicSource, "public .source.glb assets must be discovered");
  assert.equal(publicSource.sourceOnly, true);
  assert.equal(publicSource.public, true);
  assert.equal(publicSource.shipping, true, "Vite currently copies semantic source assets from public");
  assert.equal(publicSource.exclusionCandidate, true);

  const blend = inventory.assets.find((asset) => asset.path.endsWith("space_main.blend"));
  assert(blend, "Blender source files must remain inventoried");
  assert.equal(blend.sourceOnly, true);
  assert.equal(blend.public, false);
  assert.equal(blend.shipping, false);
});

test("every public file is reported because Vite ships public verbatim", async () => {
  const { createAssetInventory } = await import(pathToFileURL(auditScript).href);
  const inventory = await createAssetInventory({ repoRoot });
  const publicFiles = walk(resolve(repoRoot, "apps/web/public"));
  const reported = new Set(inventory.assets.filter((asset) => asset.public).map((asset) => asset.path));
  assert.equal(reported.size, publicFiles.length);
  for (const path of publicFiles) {
    assert(reported.has(relative(repoRoot, path).replaceAll("\\", "/")), `${path} must be inventoried`);
  }
  assert([...reported].some((path) => path.endsWith("draco_decoder.js")));
  assert([...reported].some((path) => path.endsWith("draco_wasm_wrapper.js")));
});

test("audit and check modes never mutate protected assets", () => {
  const before = protectedAssetSnapshot();
  execFileSync(process.execPath, [auditScript], { cwd: repoRoot, stdio: "pipe" });
  if (existsSync(committedReport)) {
    execFileSync(process.execPath, [auditScript, "--check", committedReport], { cwd: repoRoot, stdio: "pipe" });
  }
  assert.deepEqual(protectedAssetSnapshot(), before);
});

test("mobile and cold desktop static graphs remain 3D-free", () => {
  execFileSync(process.execPath, [resolve(repoRoot, "apps/web/tests/app/platform-shell.contract-test.mjs")], {
    cwd: repoRoot,
    stdio: "pipe",
  });
  const forbiddenPackages = ["three", "@react-three/fiber", "@react-three/rapier"];
  for (const entry of ["app/MobileApp.tsx", "app/DesktopApp.tsx"]) {
    const graph = collectStaticGraph(entry);
    const text = graph.files.map((path) => readFileSync(path, "utf8")).join("\n");
    for (const packageName of forbiddenPackages) {
      assert(
        !graph.packageImports.some((specifier) => specifier === packageName || specifier.startsWith(`${packageName}/`)),
        `${entry} static graph must not import ${packageName}`,
      );
    }
    assert.doesNotMatch(text, /(?:space_main|focus_[\w-]+)\.glb/i, `${entry} static graph must not reference world or Focus GLB`);
  }
});

test("pre-Enter desktop surface cannot reach Rapier, the world runtime, or Focus GLB", () => {
  const graph = collectStaticGraph("pages/SpacePage.tsx");
  const paths = graph.files.map((path) => relative(sourceRoot, path).replaceAll("\\", "/"));
  const text = graph.files.map((path) => readFileSync(path, "utf8")).join("\n");
  assert(!graph.packageImports.some((specifier) => specifier.startsWith("@react-three/rapier")));
  assert(!paths.some((path) => /(?:SpaceHost|SpaceSession|SpaceScene)/.test(path)), paths.join("\n"));
  assert.doesNotMatch(text, /focus_[\w-]+\.glb/i);
});
