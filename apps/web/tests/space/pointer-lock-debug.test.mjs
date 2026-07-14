import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";
import { createSpaceReturnPointerLockAttemptCoordinator } from "../../src/space/spaceReturnPointerLockAttempt.ts";

function degToRad(value) {
  return (value * Math.PI) / 180;
}

test("look rotation debug samples record per-tick yaw pitch deltas with wraparound", async () => {
  const debug = await importSourceModule("scenes/debug/spaceMovementDebug.ts");

  const first = debug.buildSpaceLookRotationDebugSample({
    tick: 1,
    yawRad: degToRad(179),
    pitchRad: degToRad(10),
    previous: null,
  });
  const second = debug.buildSpaceLookRotationDebugSample({
    tick: 2,
    yawRad: degToRad(-179),
    pitchRad: degToRad(5),
    previous: first,
  });

  assert.equal(first.deltaYawDeg, 0);
  assert.equal(first.deltaPitchDeg, 0);
  assert.equal(first.deltaTotalDeg, 0);
  assert.ok(Math.abs(second.deltaYawDeg - 2) < 1e-9);
  assert.ok(Math.abs(second.deltaPitchDeg + 5) < 1e-9);
  assert.ok(Math.abs(second.deltaTotalDeg - Math.hypot(2, -5)) < 1e-9);
});

test("frame rate debug samples report render fps and frame time", async () => {
  const debug = await importSourceModule("scenes/debug/spaceMovementDebug.ts");

  const sample = debug.buildSpaceFrameRateDebugSample({
    deltaSec: 1 / 60,
    previous: null,
  });
  const smoothed = debug.buildSpaceFrameRateDebugSample({
    deltaSec: 1 / 30,
    previous: sample,
  });

  assert.ok(Math.abs(sample.fps - 60) < 1e-9);
  assert.ok(Math.abs(sample.frameMs - 16.666666666666668) < 1e-9);
  assert.ok(smoothed.fps < 60);
  assert.ok(smoothed.fps > 30);
  assert.ok(smoothed.frameMs > sample.frameMs);
});

test("guarded pointer lock keeps normal and fast deltas, then drops impossible edge spikes", async () => {
  const controls = await importSourceModule("scenes/controls/guardedPointerLock.ts");

  assert.deepEqual(controls.resolveGuardedPointerDelta({ movementX: 18, movementY: -12 }), {
    movementX: 18,
    movementY: -12,
    dropped: false,
    reason: null,
  });
  assert.deepEqual(controls.resolveGuardedPointerDelta({ movementX: 420, movementY: 8 }), {
    movementX: 420,
    movementY: 8,
    dropped: false,
    reason: null,
  });
  assert.deepEqual(controls.resolveGuardedPointerDelta({ movementX: 6000, movementY: 8 }), {
    movementX: 0,
    movementY: 0,
    dropped: true,
    reason: "spike",
  });
  assert.deepEqual(controls.resolveGuardedPointerDelta({ movementX: 10, movementY: 5, skip: true }), {
    movementX: 0,
    movementY: 0,
    dropped: true,
    reason: "warmup",
  });
});

test("pointer lock retry failures do not permanently disable first person controls", async () => {
  const pointerLock = await importSourceModule("space/pointerLockFailure.ts");

  assert.equal(pointerLock.isPermanentPointerLockFailure("Pointer Lock API is unavailable"), true);
  assert.equal(pointerLock.isPermanentPointerLockFailure("Pointer lock request did not complete"), false);
  assert.equal(pointerLock.isPermanentPointerLockFailure("Space canvas was not ready"), false);
});

test("duplicate SPACE return starts reserve and request pointer lock exactly once", () => {
  const coordinator = createSpaceReturnPointerLockAttemptCoordinator();
  let reservationCount = 0;
  let requestCount = 0;
  const reserveRequest = () => {
    reservationCount += 1;
    return reservationCount;
  };
  const startReturn = () => {
    const result = coordinator.begin(reserveRequest);
    if (result.started) requestCount += 1;
    return result;
  };

  assert.deepEqual(startReturn(), { requestId: 1, started: true });
  assert.deepEqual(startReturn(), { requestId: 1, started: false });
  assert.equal(reservationCount, 1);
  assert.equal(requestCount, 1);
});

test("stale failure cannot cancel a newer return and matching failure retains idempotency", () => {
  const coordinator = createSpaceReturnPointerLockAttemptCoordinator();
  coordinator.begin(() => 41);
  coordinator.complete();
  coordinator.begin(() => 42);

  assert.equal(coordinator.fail(41), false);
  assert.deepEqual(coordinator.snapshot(), {
    handoffArmed: true,
    inFlight: true,
    requestId: 42,
  });
  assert.equal(coordinator.fail(42), true);
  assert.deepEqual(coordinator.snapshot(), {
    handoffArmed: false,
    inFlight: true,
    requestId: 42,
  });

  let duplicateReservations = 0;
  assert.deepEqual(coordinator.begin(() => ++duplicateReservations), {
    requestId: 42,
    started: false,
  });
  assert.equal(duplicateReservations, 0);
});
