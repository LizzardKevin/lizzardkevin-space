import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const source = (path) => readFileSync(resolve(root, "apps/web/src", path), "utf8");

test("trusted Enter never requests pointer lock before the lazy Canvas mounts", () => {
  const desktop = source("app/DesktopApp.tsx");
  const enterBody = desktop.match(/const onTrustedEnter = useCallback\(\(\) => \{([\s\S]*?)\n  \},/)?.[1] ?? "";
  assert.doesNotMatch(enterBody, /resumeSpaceFirstPerson|requestSpacePointerLock|requestPointerLock/);
  assert.match(enterBody, /setSpaceStarted\(true\)/);
});

test("the production Canvas click chain has exactly one pointer-lock owner", () => {
  const experience = source("pages/SpaceDesktopExperience.tsx");
  const scene = source("scenes/SpaceScene.tsx");
  const controls = source("scenes/controls/GuardedPointerLockControls.tsx");
  const raycast = source("scenes/exhibits/ExhibitRaycast.tsx");
  const pointerLockApi = source("space/requestSpacePointerLock.ts");

  assert.doesNotMatch(experience, /onPointerDown=\{handleCanvasPointerDown\}/);
  assert.doesNotMatch(experience, /canvasGesturePointerLock/);
  assert.doesNotMatch(raycast, /resumeSpaceFirstPersonOnGestureIfPending/);
  assert.doesNotMatch(pointerLockApi, /export function resumeSpaceFirstPersonOnGestureIfPending/);
  assert.match(scene, /<GuardedPointerLockControls selector=["']#space-canvas["'] \/>/);
  assert.match(controls, /const lock = \(\) => requestPointerLockWithRawFallback\(lockElement\)/);
  assert.match(controls, /element\.addEventListener\(["']click["'], lock\)/);
  assert.equal((controls.match(/addEventListener\(["']click["'], lock\)/g) ?? []).length, 1);
});
