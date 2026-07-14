import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { resolveSpacePointerLockTarget } from "../../src/space/spacePointerLockTarget.ts";

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
  const targetResolver = source("space/spacePointerLockTarget.ts");

  assert.doesNotMatch(experience, /onPointerDown=\{handleCanvasPointerDown\}/);
  assert.doesNotMatch(experience, /canvasGesturePointerLock/);
  assert.doesNotMatch(raycast, /resumeSpaceFirstPersonOnGestureIfPending/);
  assert.doesNotMatch(pointerLockApi, /export function resumeSpaceFirstPersonOnGestureIfPending/);
  assert.match(scene, /<GuardedPointerLockControls selector=["']#space-canvas["'] \/>/);
  assert.match(controls, /const lock = \(\) => requestPointerLockWithRawFallback\(lockElement\)/);
  assert.match(controls, /resolveSpacePointerLockTarget\(gl\.domElement\)/);
  assert.match(pointerLockApi, /resolveSpacePointerLockTarget\(\)/);
  assert.match(targetResolver, /getElementById\(["']space-canvas["']\)/);
  assert.match(controls, /element\.addEventListener\(["']click["'], lock\)/);
  assert.equal((controls.match(/addEventListener\(["']click["'], lock\)/g) ?? []).length, 1);
});

test("route-return and click controls resolve the identical Canvas target", () => {
  const canvas = {};
  const documentRoot = { getElementById: () => canvas };
  assert.equal(resolveSpacePointerLockTarget(canvas, documentRoot), canvas);
  assert.equal(resolveSpacePointerLockTarget(null, documentRoot), canvas);
});

test("Focus close delegates route and pointer-lock resume to DesktopApp exactly once", () => {
  const desktop = source("app/DesktopApp.tsx");
  const experience = source("pages/SpaceDesktopExperience.tsx");
  const pointerLockApi = source("space/requestSpacePointerLock.ts");
  const focusCloseBody = experience.match(/const handleBeginDismissFocus = useCallback\([\s\S]*?\n  \);/)?.[0] ?? "";
  const navigateBody = desktop.match(/const navigateToSpace = useCallback\([\s\S]*?\n  \);/)?.[0] ?? "";
  const escapeBody = pointerLockApi.match(/export function resumeSpaceFirstPersonAfterEscape[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(focusCloseBody, /onNavigateToSpace\(opts\)/);
  assert.doesNotMatch(focusCloseBody, /resumeSpaceFirstPerson|engageSpaceFirstPerson/);
  assert.equal((navigateBody.match(/resumeSpaceFirstPersonAfterEscape/g) ?? []).length, 1);
  assert.equal((navigateBody.match(/resumeSpaceFirstPersonWithCursorReturn/g) ?? []).length, 1);
  assert.equal((escapeBody.match(/addEventListener\(["']keyup["']/g) ?? []).length, 1);
  assert.equal((escapeBody.match(/setTimeout/g) ?? []).length, 1);
});
