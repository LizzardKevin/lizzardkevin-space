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
  return [...source.matchAll(/\bimport\s*\(\s*["'`]([^"'`$]+)["'`]\s*\)/g)].map((match) => match[1]);
}

function resolveModule(importer, specifier) {
  const base = resolve(dirname(importer), specifier);
  const candidates = extname(base)
    ? [base]
    : [base, `${base}.ts`, `${base}.tsx`, resolve(base, "index.ts"), resolve(base, "index.tsx")];
  return candidates.find((candidate) => existsSync(candidate));
}

const allowlistSource = readFileSync(entry, "utf8");
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
  assert.doesNotMatch(source, /\bimport\s*\(\s*`[^`]*\$\{/);
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
console.log("desktop lightweight route prefetch contract tests passed");
