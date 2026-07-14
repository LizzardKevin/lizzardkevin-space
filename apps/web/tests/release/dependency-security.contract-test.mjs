import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { extractDependencySpecifiers } from "../helpers/dependencySpecifiers.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const sheetJsTarball = "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz";
const sheetJsIntegrity = "sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==";
const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts"]);

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return sourceExtensions.has(extname(entry.name)) ? [path] : [];
  });
}

function assertLockedSheetJs(lockedPackage) {
  assert.equal(lockedPackage.version, "0.20.3");
  assert.equal(lockedPackage.resolved, sheetJsTarball);
  assert.equal(lockedPackage.integrity, sheetJsIntegrity);
}

function sheetJsSpecifiers(source, fileName) {
  const dependencies = extractDependencySpecifiers(source, fileName);
  return [
    ...dependencies.staticSpecifiers,
    ...dependencies.dynamicSpecifiers,
    ...dependencies.requireSpecifiers,
  ].filter((specifier) => specifier === "xlsx" || specifier.startsWith("xlsx/"));
}

test("the lock contract rejects a different well-formed SHA-512 integrity", () => {
  assert.throws(
    () =>
      assertLockedSheetJs({
        version: "0.20.3",
        resolved: sheetJsTarball,
        integrity: "sha512-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      }),
    /Expected values to be strictly equal/,
  );
});

test("the browser scanner covers every relevant JavaScript and TypeScript module extension", () => {
  const extensions = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts"];
  const fixtureRoot = mkdtempSync(resolve(tmpdir(), "space-xlsx-scanner-"));

  try {
    for (const extension of extensions) {
      writeFileSync(resolve(fixtureRoot, `module${extension}`), "export {};\n");
    }
    assert.deepEqual(
      sourceFiles(fixtureRoot).map((path) => extname(path)).sort(),
      [...extensions].sort(),
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test("the browser scanner rejects bare and subpath SheetJS module specifiers", () => {
  const forbiddenFixtures = [
    'import XLSX from "xlsx";',
    'import "xlsx";',
    'export * from "xlsx/xlsx.mjs";',
    'const XLSX = require("xlsx");',
    'const core = require("xlsx/dist/xlsx.core.min.js");',
    'const XLSX = await import("xlsx");',
    'const mini = await import("xlsx/dist/xlsx.mini.min.js");',
    'const workbook = import(/* webpackChunkName: "sheet" */ "xlsx/xlsx.mjs");',
  ];
  for (const source of forbiddenFixtures) {
    assert.notDeepEqual(sheetJsSpecifiers(source), [], source);
  }

  const allowedFixtures = [
    'const label = "xlsx";',
    'import local from "./xlsx";',
    'import compatible from "xlsx-compatible";',
    '// import "xlsx";',
    'const docs = \'import "xlsx"\';',
    "const templateDocs = `\nimport \"xlsx\";\n`;",
  ];
  for (const source of allowedFixtures) {
    assert.deepEqual(sheetJsSpecifiers(source), [], source);
  }
});

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
  assertLockedSheetJs(lockedPackage);
});

test("the browser workspace has no SheetJS runtime dependency or source import", () => {
  const webPackage = readJson(resolve(repoRoot, "apps/web/package.json"));
  assert.equal(webPackage.dependencies?.xlsx, undefined);
  assert.equal(webPackage.devDependencies?.xlsx, undefined);

  for (const path of sourceFiles(resolve(repoRoot, "apps/web/src"))) {
    assert.deepEqual(sheetJsSpecifiers(readFileSync(path, "utf8"), path), [], path);
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
