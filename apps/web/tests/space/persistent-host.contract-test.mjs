import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const src = (path) => readFileSync(resolve(root, "apps/web/src", path), "utf8").replace(/\r\n/g, "\n");

for (const path of ["space/SpaceHost.tsx", "space/SpaceRouteCoordinator.tsx", "space/spaceSessionPose.ts"]) {
  assert(existsSync(resolve(root, "apps/web/src", path)), `${path} must exist`);
}

const desktop = src("app/DesktopApp.tsx");
const host = src("space/SpaceHost.tsx");
const coordinator = src("space/SpaceRouteCoordinator.tsx");
const experience = src("pages/SpaceDesktopExperience.tsx");
const pose = src("space/spaceSessionPose.ts");
const audioDirector = src("audio/AudioDirector.ts");

assert.equal((desktop.match(/useState\(false\)/g) ?? []).length >= 1, true, "DesktopApp owns a false start latch");
assert.match(desktop, /onTrustedEnter/);
assert.match(desktop, /spaceStarted\s*\?\s*<SpaceHost/);
assert(!host.includes("spaceStarted"), "SpaceHost receives an already-started session");
assert.match(host, /<SpaceDesktopExperience/);
assert(!/key=\{(?:location|pathname)/.test(host), "host identity must not depend on location");
assert.match(coordinator, /releaseSpacePointerLock/);
assert.match(coordinator, /routeBlocked/);
assert.match(coordinator, /setRoutePaused\(pauseMainAudio\)/);
assert(!coordinator.includes("usePlayback"), "route coordinator must not subscribe to unstable playback API state");
assert.match(audioDirector, /setRoutePaused\(paused:\s*boolean\)/);
assert.match(experience, /frameloop=\{spaceRenderPaused\s*\?\s*["']never["']\s*:\s*["']always["']\}/);
assert.match(experience, /routeBlocked/);
assert.match(experience, /onNavigateToWork/);
assert.match(experience, /onNavigateToSpace/);
assert.match(experience, /invalidFocusedRoute/);
assert.match(experience, /data-work-route-not-found/);
assert.match(desktop, /route\.kind\s*===\s*["']space["']\s*&&\s*entry\.showSplash/);

assert.match(pose, /sessionStorage/);
assert.match(pose, /version:\s*1/);
assert.match(pose, /position:\s*\[number, number, number\]/);
assert.match(pose, /yaw:\s*number/);
assert.match(pose, /pitch:\s*number/);
for (const forbidden of ["renderer", "backend", "resources", "audio", "pointerLock", "boot"]) {
  assert(!pose.includes(forbidden), `session pose adapter must not serialize ${forbidden}`);
}

console.log("persistent host contract tests passed");
