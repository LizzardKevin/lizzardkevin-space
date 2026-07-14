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
const chrome = source("desktop/DesktopChrome.tsx");
const topBar = source("components/TopBar.tsx");
const focus = source("exhibits/FocusOverlay.tsx");

assert.match(main, /<BrowserRouter\s+basename=\{normalizeRouterBasename\(import\.meta\.env\.BASE_URL\)\}>/);
for (const path of ['"/"', '"/works/:exhibitId"', '"/profile"', '"/devstories"']) {
  assert(routeConfig.includes(path), `shared route contract must declare ${path}`);
}
assert.match(routes, /function\s+SpaceAliasRoute[\s\S]*?<Navigate\s+replace\s+to=["']\/["']/);
assert.match(routes, /function\s+ProfileAliasRoute[\s\S]*?<Navigate\s+replace\s+to=["']\/profile["']/);
for (const shell of [desktop, mobile]) {
  assert.match(shell, /path=["']\/space["'][\s\S]*?<SpaceAliasRoute/);
  assert.match(shell, /path=["']\/lizzardkevin["'][\s\S]*?<ProfileAliasRoute/);
}
assert.match(`${desktop}\n${mobile}`, /path=["']\*["'][\s\S]*NotFound/);

assert.match(desktop, /lazy\(\(\)\s*=>\s*import\(["']\.\.\/space\/SpaceHost["']\)\)/);
assert.match(desktop, /useState\(false\)/);
assert.match(desktop, /setSpaceStarted\(true\)/);
assert.match(desktop, /startedHost=\{[\s\S]*?spaceStarted\s*\?\s*\([\s\S]*?<SpaceHost/);
assert(!/pathname\s*,\s*setPathname|setPathname\s*\(/.test(desktop), "pathname must not be mirrored into app state");

for (const text of [routes, desktop, mobile, chrome, topBar, focus]) {
  assert(!text.includes("pushState"), "application routing must not call pushState");
  assert(!text.includes("replaceState"), "application routing must not call replaceState");
  assert(!text.includes("popstate"), "application routing must not listen to popstate");
}
assert.match(chrome, /\b(?:Link|NavLink|useNavigate)\b/);
assert.match(chrome, /spaceWordSourceRect/);
assert.match(desktop, /location\.state/);
assert.match(focus, /\buseParams\b|exhibitId/);

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
