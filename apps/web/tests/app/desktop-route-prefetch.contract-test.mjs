import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const sourceRoot = resolve(root, "apps/web/src");
const entry = resolve(sourceRoot, "desktop/lightweightRoutePrefetch.ts");

assert.equal(existsSync(entry), true, "desktop lightweight route prefetch allowlist must exist");

function staticSpecifiers(source) {
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

function dynamicSpecifiers(source) {
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
  const literalImportCount = dynamicSpecifiers(source).length;
  return [...source.matchAll(/\bimport\s*\(/g)].length !== literalImportCount;
}

const syntheticDynamicImports = [
  'import("./ProfileOverlayRoute", { with: { type: "json" } });',
  "import('./DevStoriesOverlayRoute');",
  "import(`./DesktopOverlayLayer`);",
  "import(`./${routeName}`);",
  'import("./" + routeName);',
  "import(routeSpecifier);",
].join("\n");
assert.deepEqual(dynamicSpecifiers(syntheticDynamicImports), [
  "./ProfileOverlayRoute",
  "./DevStoriesOverlayRoute",
  "./DesktopOverlayLayer",
]);
assert.equal(hasUnresolvedDynamicImport(syntheticDynamicImports), true);

function resolveModule(importer, specifier) {
  const base = resolve(dirname(importer), specifier);
  const candidates = extname(base)
    ? [base]
    : [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts"), resolve(base, "index.tsx")];
  return candidates.find((candidate) => existsSync(candidate));
}

const allowlistSource = readFileSync(entry, "utf8");
assert.equal(hasUnresolvedDynamicImport(allowlistSource), false);
assert.deepEqual(dynamicSpecifiers(allowlistSource), [
  "./ProfileOverlayRoute",
  "./DevStoriesOverlayRoute",
]);
assert.doesNotMatch(allowlistSource, /setTimeout|setInterval/);

const pending = dynamicSpecifiers(allowlistSource).map((specifier) => resolveModule(entry, specifier));
const visited = new Set();
const packages = [];
while (pending.length > 0) {
  const file = pending.pop();
  assert(file, "every allowlisted route import must resolve");
  if (visited.has(file)) continue;
  visited.add(file);
  const source = readFileSync(file, "utf8");
  assert.equal(hasUnresolvedDynamicImport(source), false, `${file} must not hide a non-literal dynamic import`);
  assert.deepEqual(dynamicSpecifiers(source), [], `${file} must not hide another dynamic import boundary`);
  for (const specifier of staticSpecifiers(source)) {
    if (!specifier.startsWith(".")) {
      packages.push(specifier);
      continue;
    }
    pending.push(resolveModule(file, specifier));
  }
}

const modules = [...visited].map((file) => file.slice(sourceRoot.length + 1).replaceAll("\\", "/"));
for (const packageName of ["three", "@react-three/fiber", "@react-three/rapier"]) {
  assert.equal(packages.some((specifier) => specifier === packageName || specifier.startsWith(`${packageName}/`)), false);
}
for (const forbidden of [
  "SpaceHost",
  "Focus",
  "exhibits/",
  "rendering/",
  "mediaLoader",
  ".glb",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".mp4",
  ".webm",
]) {
  assert.equal(modules.some((module) => module.toLowerCase().includes(forbidden.toLowerCase())), false, `prefetch graph must exclude ${forbidden}`);
}

const mobile = readFileSync(resolve(sourceRoot, "app/MobileApp.tsx"), "utf8");
assert.equal(mobile.includes("lightweightRoutePrefetch"), false);

const desktop = readFileSync(resolve(sourceRoot, "app/DesktopApp.tsx"), "utf8");
assert.match(desktop, /lightweightDesktopRoutePrefetch\.update\(\{[\s\S]*?attemptId:\s*boot\.state\.attemptId,[\s\S]*?phase:\s*boot\.state\.phase/);
assert.match(desktop, /return\s*\(\)\s*=>\s*lightweightDesktopRoutePrefetch\.cancel\(\)/);

const coldDesktopPending = [resolve(sourceRoot, "app/DesktopApp.tsx")];
const coldDesktopVisited = new Set();
const coldDesktopPackages = [];
while (coldDesktopPending.length > 0) {
  const file = coldDesktopPending.pop();
  assert(file, "every cold desktop static import must resolve");
  if (coldDesktopVisited.has(file)) continue;
  coldDesktopVisited.add(file);
  for (const specifier of staticSpecifiers(readFileSync(file, "utf8"))) {
    if (!specifier.startsWith(".")) {
      coldDesktopPackages.push(specifier);
      continue;
    }
    coldDesktopPending.push(resolveModule(file, specifier));
  }
}
const coldDesktopModules = [...coldDesktopVisited]
  .map((file) => file.slice(sourceRoot.length + 1).replaceAll("\\", "/"));
for (const packageName of ["three", "@react-three/fiber", "@react-three/rapier"]) {
  assert.equal(
    coldDesktopPackages.some((specifier) => specifier === packageName || specifier.startsWith(`${packageName}/`)),
    false,
    `cold desktop routes must not statically import ${packageName}`,
  );
}
assert.equal(coldDesktopModules.includes("space/SpaceHost.tsx"), false);
assert.equal(coldDesktopModules.includes("exhibits/FocusOverlay.tsx"), false);
assert.equal(coldDesktopModules.some((module) => module.startsWith("rendering/")), false);
assert.equal(coldDesktopModules.some((module) => module.toLowerCase().includes(".glb")), false);
assert.deepEqual(dynamicSpecifiers(desktop), [
  "../space/SpaceHost",
  "../desktop/DesktopTopBar",
  "../desktop/ProfileOverlayRoute",
  "../desktop/DevStoriesOverlayRoute",
]);
assert.match(desktop, /startedHost=\{[\s\S]*?spaceStarted\s*\?\s*\([\s\S]*?<SpaceHost/);
assert.match(desktop, /workRouteSurface\s*===\s*["']cold-work["'][\s\S]*?<ColdWorkRoute/);
assert.match(desktop, /overlayTab\s*===\s*["']lizzardkevin["'][\s\S]*?<ProfileOverlayRoute[\s\S]*?<DevStoriesOverlayRoute/);
console.log("desktop lightweight route prefetch contract tests passed");
