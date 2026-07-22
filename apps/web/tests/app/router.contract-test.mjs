import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const sourceRoot = resolve(root, "apps/web/src");
const source = (path) => readFileSync(resolve(sourceRoot, path), "utf8").replace(/\r\n/g, "\n");

assert(existsSync(resolve(sourceRoot, "app/appRoutes.tsx")), "appRoutes.tsx must exist");

const main = source("main.tsx");
const routes = source("app/appRoutes.tsx");
const routeConfig = source("app/routeConfig.ts");
const desktop = source("app/DesktopApp.tsx");
const mobile = source("app/MobileApp.tsx");
const chrome = source("desktop/DesktopTopBar.tsx");
const topBar = source("components/TopBar.tsx");
const workPage = source("pages/works/WorkDetailPage.tsx");
const shell = source("scroll/ScrollPageShell.tsx");
const globalCss = source("styles/global.css");

assert.match(main, /<BrowserRouter\s+basename=\{normalizeRouterBasename\(import\.meta\.env\.BASE_URL\)\}>/);
for (const path of ['"/"', '"/works/:exhibitId"', '"/profile"', '"/devstories"']) {
  assert(routeConfig.includes(path), `shared route contract must declare ${path}`);
}
assert.match(routes, /function\s+SpaceAliasRoute[\s\S]*?<Navigate\s+replace\s+to=["']\/["']/);
assert.match(routes, /function\s+ProfileAliasRoute[\s\S]*?<Navigate\s+replace\s+to=["']\/profile["']/);
assert.match(desktop, /path=["']\/space["'][\s\S]*?<SpaceAliasRoute/);
assert.match(desktop, /path=["']\/lizzardkevin["'][\s\S]*?<ProfileAliasRoute/);
assert.match(mobile, /aliasRedirectTo[\s\S]*?route\.kind === ["']space-alias["'][\s\S]*?["']\/["']/);
assert.match(mobile, /route\.kind === ["']profile-alias["'][\s\S]*?["']\/profile["']/);
assert.match(mobile, /<PersistentMobileExperienceBoundary[\s\S]*?aliasRedirectTo\s*\?\s*<Navigate replace to=\{aliasRedirectTo\}/);
assert.match(
  mobile,
  /if\s*\(!mobileStarted\)\s*\{[\s\S]*?if\s*\(aliasRedirectTo\)\s*return\s*<Navigate replace to=\{aliasRedirectTo\}\s*\/>;[\s\S]*?<MobileStartMenu/,
);
assert.doesNotMatch(mobile, /if \(route\.kind === ["'](?:space|profile)-alias["']\)\s*\{\s*return/);
assert.match(desktop, /path=["']\*["'][\s\S]*NotFound/);
assert.match(mobile, /PersistentMobileExperienceBoundary/);
assert(!/key=\{(?:route|decoded|view)/.test(mobile), "mobile canonical routes must not key the experience by route");

// 独立滚动页路由：ArchiveHub 同时承载 /profile 与 /devstories（同一实例，
// tab prop 切换）；/works/:exhibitId 不再有 spaceStarted 门禁。
assert.match(desktop, /lazy\(\(\)\s*=>\s*import\(["']\.\.\/pages\/archive\/ArchiveHub["']\)\)/);
assert.match(desktop, /lazy\(\(\)\s*=>\s*import\(["']\.\.\/pages\/works\/WorkDetailPage["']\)\)/);
assert.match(desktop, /path=["']\/profile["'][\s\S]*?<ArchiveHub\s+tab=["']profile["']\s*\/>/);
assert.match(desktop, /path=["']\/devstories["'][\s\S]*?<ArchiveHub\s+tab=["']devstories["']\s*\/>/);
assert.match(desktop, /path=["']\/works\/:exhibitId["'][\s\S]*?<WorkDetailPage\s*\/>/);
// 滚动页壳层提供返回 SPACE 的导航。
assert.match(shell, /navigate\(["']\/["']\)/);
// 作品页渲染 NotFound 兜底未知 exhibit id。
assert.match(workPage, /<NotFound\s*\/>/);
assert.match(globalCss, /\.app-route-layer\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?z-index:\s*70;/);

assert.match(desktop, /lazy\(\(\)\s*=>\s*import\(["']\.\.\/space\/SpaceHost["']\)\)/);
assert.match(desktop, /useState\(false\)/);
assert.match(desktop, /setSpaceStarted\(true\)/);
assert.match(desktop, /startedHost=\{[\s\S]*?spaceStarted\s*\?\s*\([\s\S]*?<SpaceHost/);
assert(!/pathname\s*,\s*setPathname|setPathname\s*\(/.test(desktop), "pathname must not be mirrored into app state");

for (const text of [routes, desktop, mobile, chrome, topBar, workPage, shell]) {
  assert(!text.includes("pushState"), "application routing must not call pushState");
  assert(!text.includes("replaceState"), "application routing must not call replaceState");
  assert(!text.includes("popstate"), "application routing must not listen to popstate");
}
assert.match(chrome, /\b(?:Link|NavLink|useNavigate)\b/);
assert.doesNotMatch(chrome, /spaceWordSourceRect/, "topbar no longer captures space word rects");
assert.doesNotMatch(desktop, /location\.state/, "desktop routes no longer read location state");
assert.match(workPage, /\buseParams\b|exhibitId/);

const files = [];
const pending = [sourceRoot];
while (pending.length) {
  const dir = pending.pop();
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) pending.push(path);
    else if (/\.[jt]sx?$/.test(entry.name)) files.push(path);
  }
}
for (const file of files) {
  const text = readFileSync(file, "utf8");
  assert(!text.includes("window.history.pushState"), `${file} must not call pushState`);
  assert(!text.includes("window.history.replaceState"), `${file} must not call replaceState`);
  assert(!text.includes('addEventListener("popstate"'), `${file} must not mirror popstate`);
}

console.log("router contract tests passed");
