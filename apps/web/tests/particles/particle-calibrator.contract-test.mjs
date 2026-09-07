import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const sourceRoot = resolve(root, "apps/web/src");
const readSource = (path) =>
  readFileSync(resolve(sourceRoot, path), "utf8").replace(/\r\n/g, "\n");
const walkSource = (directory) =>
  readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? walkSource(path) : [path];
  });

const page = readSource("pages/dev/ParticleCalibratorPage.tsx");
const renderer = readSource("particles/ParticlePointsRenderer.ts");
const loader = readSource("particles/particleCacheLoader.ts");
const material = readSource("particles/particlePointsMaterial.ts");
const desktop = readSource("app/DesktopApp.tsx");

// canvas 铺满但不拦截指针(光标经 window pointermove 喂 NDC)。
assert.match(page, /pointerEvents:\s*"none"/, "calibrator canvas must be pointer-events: none");
assert.doesNotMatch(page, /<Canvas\b/, "calibrator must use a plain canvas, not R3F <Canvas>");

// dev-only 路由:Route 注册必须被 import.meta.env.DEV 门控(production 落 NotFound)。
assert.match(
  desktop,
  /import\.meta\.env\.DEV\s*\?\s*\(\s*<Route\s+path=["']\/dev\/particle-calibrator["']/,
  "particle calibrator route must be gated by import.meta.env.DEV",
);
assert.match(
  desktop,
  /lazy\(\(\)\s*=>\s*import\(["']\.\.\/pages\/dev\/ParticleCalibratorPage["']\)\)/,
  "calibrator page must load behind a lazy boundary",
);

// 渲染闭环不得每帧重建/重写缓冲:初始化后不再碰 attribute。
assert.doesNotMatch(renderer, /\.setAttribute\(/, "renderer must not call setAttribute");
assert.doesNotMatch(renderer, /setUsage\(/, "renderer must not call setUsage");
assert.doesNotMatch(renderer, /new\s+(?:THREE\.)?BufferGeometry\b/, "renderer must not build BufferGeometry per frame");
assert.doesNotMatch(renderer, /needsUpdate\s*=\s*true/, "renderer must not flag attribute re-uploads");

// 粒子缓存 URL 由 loader 的 particleCacheUrlFor 工厂统一生成;
// 以引号/反引号开头的 /particles/ 字面路径只许留在 loader 模块内
// (调用方一律走工厂;import 说明符里的 ../../particles/ 是模块路径,不算 URL 字面量)。
assert.match(loader, /particleCacheUrlFor/);
const urlReferrers = walkSource(sourceRoot)
  .filter((path) => /\.[jt]sx?$/.test(path))
  .filter((path) => /["'`]\/particles\//.test(readFileSync(path, "utf8")))
  .map((path) => path.slice(sourceRoot.length + 1).replaceAll("\\", "/"));
assert.deepEqual(
  urlReferrers,
  ["particles/particleCacheLoader.ts"],
  "particle cache URL literals must stay inside the loader module",
);
assert.doesNotMatch(desktop, /\/particles\//, "eager shell must not reference the particle bin");

// 实例属性必须包成 InstancedBufferAttribute 再交给 instancedBufferAttribute():
// r184 BufferAttributeNode 的 instanced 标记取自 value.isInstancedBufferAttribute,
// 裸 TypedArray 会退化为逐顶点读取(所有实例挤在前 4 个点,曾表现为全黑+白三角)。
assert.match(
  material,
  /new\s+InstancedBufferAttribute\(arrays\.positions,\s*3\)/,
  "particle positions must be wrapped in InstancedBufferAttribute",
);
assert.match(
  material,
  /new\s+InstancedBufferAttribute\(arrays\.normals,\s*3\)/,
  "particle normals must be wrapped in InstancedBufferAttribute",
);
assert.match(
  material,
  /new\s+InstancedBufferAttribute\(arrays\.rands,\s*1\)/,
  "particle rands must be wrapped in InstancedBufferAttribute",
);
// 圆点依赖 alphaToCoverage,three 默认 false,必须显式开启。
assert.match(material, /alphaToCoverage\s*=\s*true/, "material must enable alphaToCoverage");

console.log("particle calibrator contract tests passed");
