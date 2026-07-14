import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const sourceRoot = resolve(root, "apps/web/src");
const readSource = (path) =>
  readFileSync(resolve(sourceRoot, path), "utf8").replace(/\r\n/g, "\n");
const walkSource = (directory) => readdirSync(directory).flatMap((entry) => {
  const path = resolve(directory, entry);
  return statSync(path).isDirectory() ? walkSource(path) : [path];
});

for (const path of ["space/SpaceCanvasHost.tsx", "space/SpaceSession.tsx", "space/SpaceHud.tsx"]) {
  assert(existsSync(resolve(sourceRoot, path)), `${path} must exist`);
}

const desktopApp = readSource("app/DesktopApp.tsx");
const host = readSource("space/SpaceHost.tsx");
const canvasHost = readSource("space/SpaceCanvasHost.tsx");
const session = readSource("space/SpaceSession.tsx");
const coordinator = readSource("space/SpaceRouteCoordinator.tsx");
const hud = readSource("space/SpaceHud.tsx");
const experience = readSource("pages/SpaceDesktopExperience.tsx");
const packageJson = JSON.parse(readFileSync(resolve(root, "apps/web/package.json"), "utf8"));

assert.match(desktopApp, /const\s+\[spaceStarted,\s*setSpaceStarted\]\s*=\s*useState\(false\)/);
assert.match(desktopApp, /onTrustedEnter/);
assert.doesNotMatch(host, /spaceStarted|setSpaceStarted/, "SpaceHost only receives an already-started session");
assert.match(desktopApp, /boot\.state\.phase/);
assert.match(host, /boot=\{boot\}/);

assert.equal((canvasHost.match(/<Canvas\b/g) ?? []).length, 1, "SpaceCanvasHost owns one main Canvas");
assert.equal((session.match(/<Physics\b/g) ?? []).length, 1, "SpaceSession owns one Physics world");
assert.equal((session.match(/<SpaceScene\b/g) ?? []).length, 1, "SpaceSession composes one SpaceScene");
assert.match(canvasHost, /<SpaceSession\b/);
assert.match(canvasHost, /createWebGPURenderer/);
assert.match(canvasHost, /switchRendererProfileState/);
assert.match(canvasHost, /<SpaceCanvasSurfaceSlot status=\{status\} renderSurfaces=\{renderSurfaces\}/);
assert.doesNotMatch(canvasHost, /onProfileResolved|onRendererError/);
assert.doesNotMatch(experience, /setResolvedProfile|setRendererError/);

const runtimeMarkupOwners = walkSource(sourceRoot)
  .filter((path) => /\.tsx$/.test(path))
  .map((path) => ({ path: path.slice(sourceRoot.length + 1).replaceAll("\\", "/"), source: readFileSync(path, "utf8") }));
assert.deepEqual(
  runtimeMarkupOwners.filter(({ source }) => /<Physics\b/.test(source)).map(({ path }) => path),
  ["space/SpaceSession.tsx"],
  "no profile or route may create a second Physics world",
);
assert.deepEqual(
  runtimeMarkupOwners.filter(({ source }) => /<SpaceScene\b/.test(source)).map(({ path }) => path),
  ["space/SpaceSession.tsx"],
  "no profile or route may create a second SPACE scene",
);
assert.deepEqual(
  runtimeMarkupOwners
    .filter(({ source }) => /<Canvas\b/.test(source))
    .map(({ path }) => path)
    .filter((path) => path !== "exhibits/FocusOverlay.tsx" && !path.endsWith("StartLobby.tsx")),
  ["space/SpaceCanvasHost.tsx"],
  "only the main host may own a persistent Canvas; Focus and a future mutually exclusive lobby are local exceptions",
);

for (const [name, source] of [
  ["SpaceDesktopExperience", experience],
  ["SpaceHost", host],
  ["SpaceHud", hud],
]) {
  assert.doesNotMatch(source, /<Canvas\b|<Physics\b|<SpaceScene\b/, `${name} must not own the main runtime`);
}

assert.match(coordinator, /routeBlocked/);
assert.match(coordinator, /releaseSpacePointerLock/);
assert.match(coordinator, /setRoutePaused\(pauseMainAudio\)/);
assert.match(canvasHost, /frameloop=\{paused\s*\?\s*["']never["']\s*:\s*["']always["']\}/);
assert.match(session, /pointerControlsEnabled/);
assert.match(session, /controlsEnabled/);
assert.doesNotMatch(session, /paused\s*\?\s*null\s*:/, "route pause must preserve Physics and SpaceScene identity");

for (const surface of ["SpaceCursorOverlay", "Crosshair", "PlaybackBar", "Toast", "WebGPUUnavailable", "SpaceBootFailure"]) {
  assert.match(hud, new RegExp(surface), `SpaceHud must own ${surface}`);
}
assert.match(hud, /role="status"/);
assert.match(hud, /space\.loading/);

assert.doesNotMatch(
  desktopApp + host + canvasHost + session + coordinator + hud + experience,
  /FullSpaceRuntime|SimplifiedSpaceRuntime/,
);
assert(!packageJson.dependencies?.zustand, "runtime split must not add a state library");
assert(!packageJson.dependencies?.jotai, "runtime split must not add a state library");
assert(!packageJson.dependencies?.redux, "runtime split must not add a state library");

console.log("SPACE runtime boundary contract tests passed");
