import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, extname, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const sourceRoot = resolve(repoRoot, "apps/web/src");
const auditScript = resolve(repoRoot, "scripts/audit-space-assets.mjs");
const committedReport = resolve(repoRoot, "docs/performance/space-asset-inventory.json");

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
  assert.equal(first.schemaVersion, 1);
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
