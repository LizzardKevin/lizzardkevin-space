import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  isSpacePointerLockActive,
  resolveSpacePointerLockTarget,
} from "../../src/space/spacePointerLockTarget.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const source = (path) => readFileSync(resolve(root, "apps/web/src", path), "utf8");

test("trusted Enter never requests pointer lock before the lazy Canvas mounts", () => {
  const desktop = source("app/DesktopApp.tsx");
  const enterBody = desktop.match(/const onTrustedEnter = useCallback\(\(\) => \{([\s\S]*?)\n  \},/)?.[1] ?? "";
  const disposedBody = desktop.match(/const onLobbyDisposed = useCallback\(\(\) => \{([\s\S]*?)\n  \},/)?.[1] ?? "";
  assert.doesNotMatch(enterBody, /resumeSpaceFirstPerson|requestSpacePointerLock|requestPointerLock/);
  assert.doesNotMatch(enterBody, /setSpaceStarted\(true\)|boot\.start\(\)/);
  assert.match(disposedBody, /setSpaceStarted\(true\)/);
  assert.match(disposedBody, /boot\.start\(\)/);
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
  assert.match(
    scene,
    /<GuardedPointerLockControls enabled=\{pointerControlsEnabled\} selector=["']#space-canvas["'] \/>/,
  );
  assert.doesNotMatch(scene, /pointerControlsEnabled\s*\?\s*<GuardedPointerLockControls/);
  assert.match(controls, /const enabledRef = useRef\(enabled\)/);
  assert.match(controls, /enabledRef\.current = enabled/);
  assert.ok(
    (controls.match(/if \(!enabledRef\.current\) return;/g) ?? []).length >= 2,
    "mousemove and Canvas click handlers must both use the current enabled gate",
  );
  assert.equal(
    (controls.match(/if \(!enabled\) return;/g) ?? []).length,
    1,
    "only R3F event computation may depend on enabled effect mounting",
  );
  assert.match(
    controls,
    /const lock = \(\) => \{\s*if \(!enabledRef\.current\) return;\s*requestPointerLockWithRawFallback\(lockElement\);\s*\}/,
  );
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

test("camera input accepts the active SPACE canvas across browser element wrappers", () => {
  const expectedCanvas = { id: "space-canvas" };
  assert.equal(isSpacePointerLockActive(expectedCanvas, expectedCanvas), true);
  assert.equal(isSpacePointerLockActive(expectedCanvas, { id: "space-canvas" }), true);
  assert.equal(isSpacePointerLockActive(expectedCanvas, { id: "other-canvas" }), false);
  assert.equal(isSpacePointerLockActive(expectedCanvas, null), false);
});

test("pointer-lock requests return an id and report every failure against that id", () => {
  const pointerLockApi = source("space/requestSpacePointerLock.ts");
  assert.match(pointerLockApi, /export function reserveSpacePointerLockRequestId\(\)/);
  assert.match(pointerLockApi, /function reportPointerLockFailure\(error: unknown, requestId: number\)/);
  assert.match(pointerLockApi, /detail:\s*\{\s*requestId,/);
  assert.match(pointerLockApi, /pendingGestureResumeRequestId/);
  assert.doesNotMatch(pointerLockApi, /let pendingGestureResume = false/);
  assert.match(
    pointerLockApi,
    /export function requestSpacePointerLock\(requestId = reserveSpacePointerLockRequestId\(\)\)/,
  );
  assert.match(pointerLockApi, /return requestId;/);
});

test("the return handoff only bypasses the blocked-route guard after SPACE was entered", () => {
  const guard = source("space/useSpacePointerLockGuard.ts");
  const policySource = guard.match(
    /export function shouldGuardSpacePointerLock\([\s\S]*?\n\}/,
  )?.[0];
  assert.ok(policySource, "the guard policy must be independently testable");
  const executablePolicySource = policySource.replace("export ", "").replaceAll(": boolean", "");
  const shouldGuard = Function(
    `"use strict"; ${executablePolicySource}; return shouldGuardSpacePointerLock;`,
  )();
  assert.equal(
    shouldGuard(true, true, false),
    true,
    "ordinary blocked routes must reject pointer lock",
  );
  assert.equal(
    shouldGuard(true, true, true),
    false,
    "an armed return may request pointer lock before the SPACE route commits",
  );
  assert.equal(
    shouldGuard(false, false, true),
    true,
    "the handoff must never bypass the pre-entry guard",
  );
});

test("the blocked-route guard synchronously removes its listener during a return handoff", () => {
  const guard = source("space/useSpacePointerLockGuard.ts");
  assert.match(guard, /import \{ useLayoutEffect \} from ["']react["']/);
  assert.match(guard, /useLayoutEffect\(\(\) => \{/);
  assert.doesNotMatch(guard, /\buseEffect\(/);
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
  assert.equal((escapeBody.match(/setTimeout/g) ?? []).length, 2);
  assert.match(escapeBody, /addEventListener\(["']blur["']/);
  assert.match(escapeBody, /addEventListener\(["']pagehide["']/);
  assert.match(escapeBody, /clearTimeout/);
});

test("Focus arms the return handoff before making exactly one pointer-lock request", () => {
  const desktop = source("app/DesktopApp.tsx");
  const navigateBody = desktop.match(/const navigateToSpace = useCallback\([\s\S]*?\n  \);/)?.[0] ?? "";
  const armIndex = navigateBody.indexOf("setReturningToSpace(true)");
  const normalRequestIndex = navigateBody.indexOf("resumeSpaceFirstPersonWithCursorReturn(pointerLockRequestId)");
  const escapeRequestIndex = navigateBody.indexOf("resumeSpaceFirstPersonAfterEscape(");

  assert.match(navigateBody, /returnAttemptRef\.current\.begin\(reserveSpacePointerLockRequestId\)/);
  assert.ok(armIndex >= 0 && armIndex < normalRequestIndex);
  assert.ok(armIndex < escapeRequestIndex);
  assert.equal((navigateBody.match(/resumeSpaceFirstPersonWithCursorReturn\(pointerLockRequestId\)/g) ?? []).length, 1);
  assert.equal((navigateBody.match(/resumeSpaceFirstPersonAfterEscape\(/g) ?? []).length, 1);
});

test("Profile and DevStories commit the SPACE route before requesting lock and retain only the close animation", () => {
  const desktop = source("app/DesktopApp.tsx");
  const beginCloseBody = desktop.match(/const beginOverlayClose = useCallback\([\s\S]*?\n  \);/)?.[0] ?? "";
  const onClosedBodies = [...desktop.matchAll(/onClosed=\{\(\) => \{([\s\S]*?)\n              \}\}/g)].map(
    (match) => match[1],
  );
  const armIndex = beginCloseBody.indexOf("setReturningToSpace(true)");
  const navigateIndex = beginCloseBody.indexOf("navigate(APP_ROUTE_PATHS.space)");
  const normalRequestIndex = beginCloseBody.indexOf("resumeSpaceFirstPersonWithCursorReturn(pointerLockRequestId)");
  const escapeRequestIndex = beginCloseBody.indexOf("resumeSpaceFirstPersonAfterEscape(");

  assert.ok(armIndex >= 0 && armIndex < normalRequestIndex);
  assert.ok(armIndex < escapeRequestIndex);
  assert.ok(navigateIndex >= 0 && navigateIndex < normalRequestIndex);
  assert.ok(navigateIndex < escapeRequestIndex);
  assert.match(beginCloseBody, /if \(!returnAttempt\.started\) return;/);
  assert.match(beginCloseBody, /setClosingOverlay\(\{/);
  assert.equal((beginCloseBody.match(/resumeSpaceFirstPersonWithCursorReturn\(pointerLockRequestId\)/g) ?? []).length, 1);
  assert.equal((beginCloseBody.match(/resumeSpaceFirstPersonAfterEscape\(/g) ?? []).length, 1);
  assert.equal(onClosedBodies.length, 2);
  for (const body of onClosedBodies) {
    assert.match(body, /setClosingOverlay\(null\)/);
    assert.doesNotMatch(body, /navigate\(|navigateToSpace|resumeSpaceFirstPerson|requestSpacePointerLock/);
  }
  assert.match(desktop, /const effectiveRouteBlocked = routeBlocked \|\| closingOverlay !== null/);
  assert.match(desktop, /routeBlocked=\{effectiveRouteBlocked\}/);
  assert.match(desktop, /pauseMainAudio=\{routePolicy\.pauseMainAudio \|\| closingOverlay !== null\}/);
});

test("the return handoff clears on SPACE commit and pointer-lock failure or cancellation", () => {
  const desktop = source("app/DesktopApp.tsx");
  assert.match(
    desktop,
    /returnAttemptRef\.current\.fail\(detail\.requestId\)/,
  );
  assert.match(
    desktop,
    /if \(!detail \|\| !returnAttemptRef\.current\.fail\(detail\.requestId\)\) return;/,
  );
  assert.match(
    desktop,
    /if \(route\.kind === ["']space["'] && closingOverlay === null && returningToSpace\) \{\s*setReturningToSpace\(false\);/,
  );
  assert.match(desktop, /if \(route\.kind === ["']space["'] && closingOverlay === null\) \{\s*returnAttemptRef\.current\.complete\(\);/);
});
