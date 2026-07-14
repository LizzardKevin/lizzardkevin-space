import assert from "node:assert/strict";
import test from "node:test";
import { requestPointerLockFromReadyCanvasGesture } from "../../src/space/canvasGesturePointerLock.ts";

test("Enter cannot request pointer lock before the real Canvas is ready", () => {
  let requests = 0;
  const canvas = {};
  const requested = requestPointerLockFromReadyCanvasGesture({
    gestureTarget: null,
    readyCanvas: canvas,
    controlsEligible: false,
    pointerLocked: false,
    request: () => { requests += 1; },
  });
  assert.equal(requested, false);
  assert.equal(requests, 0);
});

test("the first eligible real Canvas gesture requests pointer lock exactly once", () => {
  let requests = 0;
  const canvas = {};
  const requested = requestPointerLockFromReadyCanvasGesture({
    gestureTarget: canvas,
    readyCanvas: canvas,
    controlsEligible: true,
    pointerLocked: false,
    request: () => { requests += 1; },
  });
  assert.equal(requested, true);
  assert.equal(requests, 1);
});

test("a gesture from a sibling or stale Canvas cannot request pointer lock", () => {
  let requests = 0;
  const requested = requestPointerLockFromReadyCanvasGesture({
    gestureTarget: {},
    readyCanvas: {},
    controlsEligible: true,
    pointerLocked: false,
    request: () => { requests += 1; },
  });
  assert.equal(requested, false);
  assert.equal(requests, 0);
});
