import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const sourceRoot = resolve(workspaceRoot, "apps/web/src");
const sourcePath = (relativePath) => resolve(sourceRoot, relativePath);
const readSource = (relativePath) => readFileSync(sourcePath(relativePath), "utf8").replace(/\r\n/g, "\n");

function staticDependencySpecifiers(source) {
  const matches = [];
  const patterns = [
    /^\s*import\s+(?!type\b)(?:["']([^"']+)["']|[\s\S]*?\sfrom\s+["']([^"']+)["'])\s*;?/gm,
    /^\s*export\s+(?:\*(?:\s+as\s+[\w$]+)?|\{[\s\S]*?\})\s+from\s+["']([^"']+)["']\s*;?/gm,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      matches.push({ index: match.index, specifier: match[1] ?? match[2] });
    }
  }
  return matches.sort((left, right) => left.index - right.index).map(({ specifier }) => specifier);
}

function dynamicImportSpecifiers(source) {
  const matches = [];
  const patterns = [
    /\bimport\s*\(\s*"((?:\\.|[^"\\])*)"\s*(?=,|\))/g,
    /\bimport\s*\(\s*'((?:\\.|[^'\\])*)'\s*(?=,|\))/g,
    /\bimport\s*\(\s*`((?:\\.|[^`$\\])*)`\s*(?=,|\))/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      matches.push({ index: match.index, specifier: match[1] });
    }
  }
  return matches.sort((left, right) => left.index - right.index).map(({ specifier }) => specifier);
}

function hasUnresolvedDynamicImport(source) {
  return /\bimport\s*\(\s*`(?:\\.|[^`\\])*\$\{(?:\\.|[^`\\])*\}(?:\\.|[^`\\])*`\s*(?=,|\))/.test(source);
}

const requiredShells = ["app/DesktopApp.tsx", "app/MobileApp.tsx"];
for (const shell of requiredShells) {
  assert(existsSync(sourcePath(shell)), `${shell} must define a document-level platform shell`);
}

const main = readSource("main.tsx");
const app = readSource("App.tsx");

const syntheticDependencies = [
  'import value from "./static";',
  'import "./side-effect";',
  'export { value as renamed } from "./named-reexport";',
  'export * from "./star-reexport";',
  'const desktopOnly = import("../scenes/SpaceHost");',
  "const singleQuoted = import('../scenes/SpaceHost');",
  'const templateLiteral = import(`../scenes/SpaceHost`);',
  'const withOptions = import("../scenes/SpaceHost", { with: { type: "json" } });',
  'const interpolated = import(`../scenes/${sceneName}`);',
].join("\n");

test("dependency extractor follows static imports and re-exports without following dynamic imports", () => {
  assert.deepEqual(staticDependencySpecifiers(syntheticDependencies), [
    "./static",
    "./side-effect",
    "./named-reexport",
    "./star-reexport",
  ]);
});

test("dependency extractor reports dynamic import specifiers separately", () => {
  assert.deepEqual(dynamicImportSpecifiers(syntheticDependencies), [
    "../scenes/SpaceHost",
    "../scenes/SpaceHost",
    "../scenes/SpaceHost",
    "../scenes/SpaceHost",
  ]);
});

test("dependency extractor rejects interpolated dynamic import templates", () => {
  assert.equal(hasUnresolvedDynamicImport(syntheticDependencies), true);
});

test("App loading fallback is a stable accessible white status surface", () => {
  assert.match(app, /fallback=\{\s*<div[\s\S]*?role=["']status["'][\s\S]*?aria-live=["']polite["'][\s\S]*?>/);
  assert.match(app, /background(?:Color)?:\s*["']#fff(?:fff)?["']/i);
  assert.match(app, /color:\s*["']#050505["']/i);
  assert.match(app, /display:\s*["']grid["'][\s\S]*placeItems:\s*["']center["']/);
  assert.match(app, />\s*Loading application(?:\.\.\.|…)?\s*<\/div>/);
});

assert.equal(
  [...main.matchAll(/\bdetectClientPlatform\s*\(/g)].length,
  1,
  "main.tsx must detect the client platform exactly once",
);
assert(
  /const\s+platform\s*:\s*ClientPlatform\s*=\s*detectClientPlatform\s*\(\s*\)/.test(main) &&
    /<App\s+platform=\{platform\}\s*\/>/.test(main),
  "main.tsx must pass its one detected ClientPlatform into App",
);
assert(
  /import\s*\{[^}]*\btype\s+ClientPlatform\b[^}]*\}\s+from\s+["']\.\/platform\/clientPlatform["']/.test(main),
  "main.tsx must type the document-level platform value as ClientPlatform",
);

assert(
  /lazy\(\(\)\s*=>\s*import\(["']\.\/app\/DesktopApp["']\)\)/.test(app),
  "App must lazy-load the desktop shell",
);
assert(
  /lazy\(\(\)\s*=>\s*import\(["']\.\/app\/MobileApp["']\)\)/.test(app),
  "App must lazy-load the mobile shell",
);
assert(
  /function\s+App\s*\(\s*\{\s*platform\s*\}\s*:\s*\{\s*platform\s*:\s*ClientPlatform\s*\}\s*\)/.test(app),
  "App must be a pure platform-prop shell",
);
assert(
  /<Suspense[\s\S]*fallback=\{[\s\S]*<div[\s\S]*height:\s*["']100vh["'][\s\S]*width:\s*["']100vw["'][\s\S]*<\/Suspense>/.test(app) &&
    /platform\s*===\s*["']desktop["']\s*\?\s*<DesktopApp\s*\/>\s*:\s*<MobileApp\s*\/>/.test(app),
  "App must branch to the two lazy shells behind a stable Suspense fallback",
);

const appForbidden = [
  "SpacePage",
  "DesktopChrome",
  "MobileExperience",
  "pointerLock",
  "PointerLock",
  "Overlay",
  "three",
  "@react-three/fiber",
  "@react-three/rapier",
];
for (const token of appForbidden) {
  assert(!app.includes(token), `App must not directly reference ${token}`);
}

function resolveRelativeModule(importer, specifier) {
  const base = resolve(dirname(importer), specifier);
  const candidates = extname(base)
    ? [base]
    : [base, `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, resolve(base, "index.ts"), resolve(base, "index.tsx")];
  return candidates.find((candidate) => existsSync(candidate));
}

function staticRelativeImports(filePath) {
  const source = readFileSync(filePath, "utf8");
  const imports = [];
  for (const specifier of staticDependencySpecifiers(source).filter((candidate) => candidate.startsWith("."))) {
    const imported = resolveRelativeModule(filePath, specifier);
    assert(imported, `static import ${specifier} from ${filePath} must resolve`);
    imports.push(imported);
  }
  return imports;
}

function collectStaticGraph(entry) {
  const pending = [entry];
  const visited = new Set();
  while (pending.length > 0) {
    const filePath = pending.pop();
    if (!filePath || visited.has(filePath)) continue;
    visited.add(filePath);
    pending.push(...staticRelativeImports(filePath));
  }
  return [...visited];
}

const mobileGraph = collectStaticGraph(sourcePath("app/MobileApp.tsx"));
const mobileGraphModules = mobileGraph
  .map((filePath) => filePath.slice(sourceRoot.length + 1).replaceAll("\\", "/"))
  .join("\n");
const mobileImportSpecifiers = mobileGraph.flatMap((filePath) => {
  const source = readFileSync(filePath, "utf8");
  return staticDependencySpecifiers(source);
});
const mobileDynamicImportSpecifiers = mobileGraph.flatMap((filePath) => {
  const source = readFileSync(filePath, "utf8");
  assert(
    !hasUnresolvedDynamicImport(source),
    `${filePath.slice(sourceRoot.length + 1)} must not use an interpolated dynamic import template`,
  );
  return dynamicImportSpecifiers(source);
});
for (const packageName of ["three", "@react-three/fiber", "@react-three/rapier"]) {
  assert(
    !mobileImportSpecifiers
      .some((specifier) => specifier === packageName || specifier.startsWith(`${packageName}/`)),
    `MobileApp static graph must not contain ${packageName}`,
  );
  assert(
    !mobileDynamicImportSpecifiers
      .some((specifier) => specifier === packageName || specifier.startsWith(`${packageName}/`)),
    `MobileApp visited graph must not dynamically import ${packageName}`,
  );
}
for (const token of ["desktop", "scenes", "rendering", "SpaceDesktopExperience", "SpaceHost", "StartLobby", ".glb"]) {
  assert(
    !mobileGraphModules.toLowerCase().includes(token.toLowerCase()) &&
      !mobileImportSpecifiers.some((specifier) => specifier.toLowerCase().includes(token.toLowerCase())),
    `MobileApp static graph must not contain ${token}`,
  );
  assert(
    !mobileDynamicImportSpecifiers.some((specifier) => specifier.toLowerCase().includes(token.toLowerCase())),
    `MobileApp visited graph must not dynamically import ${token}`,
  );
}

const allSourceFiles = [];
const sourceDirectories = [sourceRoot];
while (sourceDirectories.length > 0) {
  const directory = sourceDirectories.pop();
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) sourceDirectories.push(entryPath);
    else if (/\.[jt]sx?$/.test(entry.name)) allSourceFiles.push(entryPath);
  }
}
for (const filePath of allSourceFiles) {
  assert(
    !readFileSync(filePath, "utf8").includes("useClientPlatform"),
    `${filePath.slice(sourceRoot.length + 1)} must not reference useClientPlatform`,
  );
}

console.log("platform shell contract tests passed");
