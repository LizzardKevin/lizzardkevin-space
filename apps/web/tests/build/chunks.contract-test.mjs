import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { webPath } from "../helpers/projectPaths.mjs";

const distDir = webPath("dist");
const assetsDir = webPath("dist/assets");
const indexHtmlPath = webPath("dist/index.html");
const MAX_HTML_PRELOAD_JS_BYTES = 500 * 1024;

function readText(url) {
  assert(existsSync(url), `${url} must exist. Run npm run build first.`);
  return readFileSync(url, "utf8");
}

function assetPathFromHtmlPath(htmlPath) {
  const assetsIndex = htmlPath.indexOf("/assets/");
  if (assetsIndex >= 0) return htmlPath.slice(assetsIndex + 1);
  return htmlPath.replace(/^\.\//, "").replace(/^\//, "");
}

function staticJavaScriptImports(fileName) {
  const source = readText(join(assetsDir, fileName));
  return [...source.matchAll(/\bimport(?!\s*\()\s*(?:[^;"']*?\s*from\s*)?["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((specifier) => specifier.startsWith("./") && specifier.endsWith(".js"))
    .map((specifier) => specifier.slice(2));
}

function findStaticImportPath(rootFile, targetPattern) {
  const queue = [[rootFile]];
  const visited = new Set();

  while (queue.length > 0) {
    const importPath = queue.shift();
    const fileName = importPath.at(-1);
    if (visited.has(fileName)) continue;
    visited.add(fileName);

    if (targetPattern.test(fileName)) return importPath;

    for (const dependency of staticJavaScriptImports(fileName)) {
      assert(assetFiles.includes(dependency), `${fileName} statically imports missing asset ${dependency}`);
      queue.push([...importPath, dependency]);
    }
  }

  return null;
}

const indexHtml = readText(indexHtmlPath);
assert(existsSync(assetsDir), "dist/assets must exist. Run npm run build first.");

const assetFiles = readdirSync(assetsDir).filter((file) => file.endsWith(".js"));
const rapierChunks = assetFiles.filter((file) => /^rapier-vendor-[\w.-]+\.js$/.test(file));

assert.equal(rapierChunks.length, 1, "rapier-vendor must remain a single independent JS chunk");

const modulePreloadMatches = [...indexHtml.matchAll(/<link\b[^>]*rel="modulepreload"[^>]*href="([^"]+\.js)"[^>]*>/g)];
const htmlPreloadPaths = modulePreloadMatches.map((match) => match[1]);

assert(
  !htmlPreloadPaths.some((assetPath) => assetPath.includes("rapier-vendor")),
  "index.html must not modulepreload rapier-vendor",
);

for (const assetPath of htmlPreloadPaths) {
  const normalizedAssetPath = assetPathFromHtmlPath(assetPath);
  const preloadFilePath = join(distDir, normalizedAssetPath);
  const size = statSync(preloadFilePath).size;
  assert(
    size < MAX_HTML_PRELOAD_JS_BYTES,
    `${assetPath} is ${Math.round(size / 1024)}KB; HTML-preloaded JS chunks must stay below 500KB`,
  );
}

const entryScriptMatch = indexHtml.match(/<script\b[^>]*type="module"[^>]*src="([^"]*index-[^"]+\.js)"[^>]*>/);
assert(entryScriptMatch, "index.html must include a built index-*.js module entry");

const entryAssetPath = assetPathFromHtmlPath(entryScriptMatch[1]);
const entryJs = readText(join(distDir, entryAssetPath));

const staticRapierImport =
  /(?:^|[;\n])\s*import(?!\()\s*(?:[\w*{}\s,$]+from\s*)?["'][^"']*rapier-vendor-[^"']+\.js["']/m;
assert(!staticRapierImport.test(entryJs), "main index-*.js must not statically import rapier-vendor");

assert(
  !entryJs.includes("rapier-vendor"),
  "main index-*.js must not eagerly reference rapier-vendor through preload metadata",
);

const startLobbyRoots = assetFiles.filter((file) => {
  const source = readText(join(assetsDir, file));
  return source.includes("start-lobby") && source.includes("data-disposing") && source.includes("LizzardKevin Space");
});
assert(
  startLobbyRoots.length > 0,
  "production build must contain a chunk with the Desktop StartLobby implementation",
);

const preEnterRoots = [entryAssetPath.replace(/^assets\//, ""), ...startLobbyRoots];

for (const rootFile of preEnterRoots) {
  const rapierImportPath = findStaticImportPath(rootFile, /^rapier-vendor-[\w.-]+\.js$/);
  assert(
    !rapierImportPath,
    `${rootFile} must not statically reach Rapier before Enter${
      rapierImportPath ? `: ${rapierImportPath.join(" -> ")}` : ""
    }`,
  );
}

console.log("build chunk contract tests passed");
