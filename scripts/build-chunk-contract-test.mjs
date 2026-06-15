import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const distDir = new URL("../apps/web/dist/", import.meta.url);
const assetsDir = new URL("./assets/", distDir);
const indexHtmlPath = new URL("./index.html", distDir);
const MAX_HTML_PRELOAD_JS_BYTES = 500 * 1024;

function readText(url) {
  assert(existsSync(url), `${url.pathname} must exist. Run npm run build first.`);
  return readFileSync(url, "utf8");
}

function assetPathFromHtmlPath(htmlPath) {
  return htmlPath.replace(/^\.\//, "").replace(/^\//, "");
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
  const preloadFilePath = join(distDir.pathname, normalizedAssetPath);
  const size = statSync(preloadFilePath).size;
  assert(
    size < MAX_HTML_PRELOAD_JS_BYTES,
    `${assetPath} is ${Math.round(size / 1024)}KB; HTML-preloaded JS chunks must stay below 500KB`,
  );
}

const entryScriptMatch = indexHtml.match(/<script\b[^>]*type="module"[^>]*src="([^"]*index-[^"]+\.js)"[^>]*>/);
assert(entryScriptMatch, "index.html must include a built index-*.js module entry");

const entryAssetPath = assetPathFromHtmlPath(entryScriptMatch[1]);
const entryJs = readText(new URL(`./${entryAssetPath}`, distDir));

const staticRapierImport =
  /(?:^|[;\n])\s*import(?!\()\s*(?:[\w*{}\s,$]+from\s*)?["'][^"']*rapier-vendor-[^"']+\.js["']/m;
assert(!staticRapierImport.test(entryJs), "main index-*.js must not statically import rapier-vendor");

assert(
  !entryJs.includes("rapier-vendor"),
  "main index-*.js must not eagerly reference rapier-vendor through preload metadata",
);

console.log("build chunk contract tests passed");
