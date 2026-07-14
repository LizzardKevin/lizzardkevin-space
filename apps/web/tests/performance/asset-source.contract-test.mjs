import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const auditScript = resolve(repoRoot, "scripts/audit-space-assets.mjs");

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

test("source/public inventory is build-independent and accounts for every public file", async () => {
  const { createSourceAssetInventory } = await import(pathToFileURL(auditScript).href);
  const source = createSourceAssetInventory({ repoRoot });
  const publicFiles = walk(resolve(repoRoot, "apps/web/public"));
  assert.equal(source.assets.filter((asset) => asset.public).length, publicFiles.length);
  assert.equal(source.totals.publicShipping.files, publicFiles.length);
  for (const path of publicFiles) {
    assert(source.assets.some((asset) => asset.path === relative(repoRoot, path).replaceAll("\\", "/")));
  }
  assert(!JSON.stringify(source).includes("apps/web/dist"));
});

test("quick contract wiring runs the build-independent source gate", () => {
  const scripts = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8")).scripts;
  assert.equal(
    scripts["test:asset-source"],
    "node --test apps/web/tests/performance/asset-source.contract-test.mjs",
  );
  assert.match(scripts["test:contracts"], /npm run test:asset-source/);
  assert(existsSync(auditScript));
});

test("source discovery rejects symlinked asset trees instead of following them", async () => {
  const { createSourceAssetInventory } = await import(pathToFileURL(auditScript).href);
  const temp = mkdtempSync(resolve(tmpdir(), "space-source-link-"));
  const fakeRoot = resolve(temp, "repo");
  const outside = resolve(temp, "outside");
  mkdirSync(resolve(fakeRoot, "apps/web/public"), { recursive: true });
  mkdirSync(outside, { recursive: true });
  try {
    symlinkSync(outside, resolve(fakeRoot, "apps/web/public/linked-assets"), "junction");
    assert.throws(() => createSourceAssetInventory({ repoRoot: fakeRoot }), /symbolic link|reparse/i);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("raw deployed header evidence preserves command, timestamp, and representative responses", () => {
  const evidence = readFileSync(resolve(repoRoot, "docs/performance/github-pages-headers-2026-07-14.txt"), "utf8");
  assert.match(evidence, /Capture timestamp: 2026-07-14T11:20:28Z/);
  assert.match(evidence, /curl\.exe -sS -L -I/);
  for (const path of [
    "/lizzardkevin-space/",
    "/assets/index-aEZfzqC9.js",
    "/models/space_main.glb",
    "/draco/draco_decoder.wasm",
    "/audio/space_background_looped.mp3",
    "/exhibits/manifest.json",
  ]) {
    assert(evidence.includes(path), path);
  }
  assert.equal((evidence.match(/HTTP\/1\.1 200 OK/g) ?? []).length, 6);
});
