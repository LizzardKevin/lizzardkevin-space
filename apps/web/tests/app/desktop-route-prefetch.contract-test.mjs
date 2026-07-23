import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const sourceRoot = resolve(root, "apps/web/src");
const entry = resolve(sourceRoot, "desktop/lightweightRoutePrefetch.ts");
const globalCss = readFileSync(resolve(sourceRoot, "styles/global.css"), "utf8");

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

function hasSpeculativeMedia(source) {
  return (
    /\bfetch\s*\(/.test(source) ||
    /\bnew\s+(?:Image|Audio|Video)\s*\(/.test(source) ||
    /\bdocument\.createElement\s*\(\s*["'](?:img|audio|video|source)["']\s*\)/i.test(source) ||
    /\.(?:jpe?g|png|webp|avif|gif|svg|mp4|webm|mp3|wav|ogg)(?:[?#["'`)]|$)/i.test(source)
  );
}

function is3dRuntimePackage(specifier) {
  return /^(?:three(?:\/|$)|@react-three\/|@dimforge\/|@react-spring\/three(?:\/|$)|camera-controls(?:\/|$)|troika-(?:three-text|worker-utils)(?:\/|$)|meshline(?:\/|$)|postprocessing(?:\/|$))/.test(specifier);
}

for (const source of [
  'fetch("/media/work.jpg")',
  "const image = new Image()",
  "const audio = new Audio()",
  'const video = "/media/work.mp4"',
]) {
  assert.equal(hasSpeculativeMedia(source), true, `must reject speculative media source: ${source}`);
}
for (const specifier of ["three/webgpu", "@react-three/drei", "@dimforge/rapier3d", "camera-controls"] ) {
  assert.equal(is3dRuntimePackage(specifier), true, `must reject 3D runtime package: ${specifier}`);
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
  "../pages/archive/ArchiveHub",
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
  assert.equal(hasSpeculativeMedia(source), false, `${file} must not issue speculative media requests`);
  for (const specifier of staticSpecifiers(source)) {
    if (!specifier.startsWith(".")) {
      packages.push(specifier);
      continue;
    }
    pending.push(resolveModule(file, specifier));
  }
}

const modules = [...visited].map((file) => file.slice(sourceRoot.length + 1).replaceAll("\\", "/"));
assert.equal(packages.some(is3dRuntimePackage), false, "prefetch graph must exclude all known 3D runtime packages");
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
assert.equal(
  coldDesktopPackages.some(is3dRuntimePackage),
  false,
  "cold desktop routes must not statically import a known 3D runtime package",
);
assert.equal(coldDesktopModules.includes("space/SpaceHost.tsx"), false);
assert.equal(coldDesktopModules.includes("exhibits/FocusOverlay.tsx"), false);
assert.equal(coldDesktopModules.some((module) => module.startsWith("rendering/")), false);
assert.equal(coldDesktopModules.some((module) => module.toLowerCase().includes(".glb")), false);
assert.deepEqual(dynamicSpecifiers(desktop), [
  "../space/SpaceHost",
  "../pages/SpacePage",
  "../desktop/DesktopTopBar",
  "../pages/archive/ArchiveHub",
  "../pages/works/WorkDetailPage",
]);
assert.match(desktop, /startedHost=\{[\s\S]*?spaceStarted\s*\?\s*\([\s\S]*?<SpaceHost/);
assert.match(desktop, /path=["']\/works\/:exhibitId["'][\s\S]*?<Suspense\s+fallback=\{<DesktopRouteLoading\s*\/>\}>\s*<WorkDetailPage/);
assert.match(desktop, /spaceStarted\s*&&\s*entered\s*&&\s*route\.kind\s*===\s*["']space["'][\s\S]*?<DesktopTopBar/);
assert.match(desktop, /function\s+DesktopRouteLoading[\s\S]*?role=["']status["'][\s\S]*?aria-live=["']polite["']/);
assert.match(desktop, /fallback=\{<DesktopRouteLoading\s*\/>\}/);
assert.match(globalCss, /\.desktop-route-loading__indicator\s*\{[\s\S]*?animation:/);
assert.match(globalCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.desktop-route-loading__indicator\s*\{[\s\S]*?animation:\s*none/);
console.log("desktop lightweight route prefetch contract tests passed");
