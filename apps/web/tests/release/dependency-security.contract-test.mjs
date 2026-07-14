import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const sheetJsTarball = "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return [".js", ".jsx", ".ts", ".tsx"].includes(extname(entry.name)) ? [path] : [];
  });
}

test("the root development dependency uses the exact audited SheetJS tarball", () => {
  const rootPackage = readJson(resolve(repoRoot, "package.json"));
  const lock = readJson(resolve(repoRoot, "package-lock.json"));

  assert.equal(rootPackage.devDependencies.xlsx, sheetJsTarball);
  assert.equal(lock.packages[""].devDependencies.xlsx, sheetJsTarball);
});

test("the installed and locked SheetJS package is version 0.20.3 with integrity", () => {
  const installedPackage = readJson(resolve(repoRoot, "node_modules/xlsx/package.json"));
  const lock = readJson(resolve(repoRoot, "package-lock.json"));
  const lockedPackage = lock.packages["node_modules/xlsx"];

  assert.equal(installedPackage.version, "0.20.3");
  assert.equal(lockedPackage.version, "0.20.3");
  assert.equal(lockedPackage.resolved, sheetJsTarball);
  assert.match(lockedPackage.integrity, /^sha512-[A-Za-z0-9+/]+={0,2}$/);
});

test("the browser workspace has no SheetJS runtime dependency or source import", () => {
  const webPackage = readJson(resolve(repoRoot, "apps/web/package.json"));
  assert.equal(webPackage.dependencies?.xlsx, undefined);
  assert.equal(webPackage.devDependencies?.xlsx, undefined);

  const xlsxImport = /(?:from\s*|import\s*\(|require\s*\()\s*["']xlsx["']/;
  for (const path of sourceFiles(resolve(repoRoot, "apps/web/src"))) {
    assert.doesNotMatch(readFileSync(path, "utf8"), xlsxImport, path);
  }
});

test("the Node ESM SheetJS consumers register the filesystem adapter", () => {
  const consumers = [
    "scripts/generate-space-content.mjs",
    "apps/web/tests/exhibits/workbook-pipeline.contract-test.mjs",
  ];

  for (const relativePath of consumers) {
    const source = readFileSync(resolve(repoRoot, relativePath), "utf8");
    assert.match(source, /import \* as fs from "node:fs";/, relativePath);
    assert.match(source, /XLSX\.set_fs\(fs\);/, relativePath);
  }
});
