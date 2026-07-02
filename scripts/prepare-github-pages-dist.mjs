import { copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(repoRoot, "apps/web/dist");
const indexPath = path.join(distRoot, "index.html");

function normalizeBase(base) {
  const trimmed = base.trim();
  if (!trimmed || trimmed === "/" || trimmed === "./") return "/";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}/`;
}

const expectedBase = normalizeBase(process.env.SPACE_GITHUB_PAGES_BASE ?? "/lizzardkevin-space/");

if (!existsSync(indexPath)) {
  throw new Error("apps/web/dist/index.html does not exist. Run the GitHub Pages build first.");
}

const indexHtml = readFileSync(indexPath, "utf8");
if (expectedBase !== "/" && !indexHtml.includes(`${expectedBase}assets/`)) {
  throw new Error(`dist/index.html does not appear to use the expected base path ${expectedBase}`);
}

const cssFiles = readdirSync(path.join(distRoot, "assets")).filter((file) => file.endsWith(".css"));
for (const cssFile of cssFiles) {
  const css = readFileSync(path.join(distRoot, "assets", cssFile), "utf8");
  if (/url\(["']?\/fonts\//.test(css)) {
    throw new Error(`${cssFile} still references /fonts/ without the GitHub Pages base path`);
  }
}

copyFileSync(indexPath, path.join(distRoot, "404.html"));
writeFileSync(path.join(distRoot, ".nojekyll"), "");

console.log(`Prepared GitHub Pages dist with SPA fallback and base ${expectedBase}`);
