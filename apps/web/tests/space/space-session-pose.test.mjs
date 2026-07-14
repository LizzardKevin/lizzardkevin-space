import assert from "node:assert/strict";
import test from "node:test";
import {
  readSpaceSessionPose,
  writeSpaceSessionPose,
} from "../../src/space/spaceSessionPose.ts";

function memoryStorage(initial = new Map()) {
  return {
    getItem(key) {
      return initial.get(key) ?? null;
    },
    setItem(key, value) {
      initial.set(key, value);
    },
  };
}

test("round-trips only the versioned semantic pose", () => {
  const storage = memoryStorage();
  writeSpaceSessionPose(storage, { position: [1, 2, 3], yawRad: 0.25, pitchRad: -0.1 });
  const raw = JSON.parse(storage.getItem("spaceSessionPoseV1"));
  assert.deepEqual(raw, { version: 1, position: [1, 2, 3], yaw: 0.25, pitch: -0.1 });
  assert.deepEqual(readSpaceSessionPose(storage), {
    position: [1, 2, 3],
    yawRad: 0.25,
    pitchRad: -0.1,
  });
});

test("rejects non-finite, malformed, and out-of-bounds records", () => {
  for (const value of [
    { version: 2, position: [1, 2, 3], yaw: 0, pitch: 0 },
    { version: 1, position: [1, 2], yaw: 0, pitch: 0 },
    { version: 1, position: [501, 2, 3], yaw: 0, pitch: 0 },
    { version: 1, position: [1, 2, 3], yaw: Number.NaN, pitch: 0 },
    { version: 1, position: [1, 2, 3], yaw: 0, pitch: Math.PI },
  ]) {
    const storage = memoryStorage(new Map([["spaceSessionPoseV1", JSON.stringify(value)]]));
    assert.equal(readSpaceSessionPose(storage), null);
  }
});

test("storage failures never interrupt SPACE", () => {
  const storage = {
    getItem() { throw new Error("denied"); },
    setItem() { throw new Error("denied"); },
  };
  assert.equal(readSpaceSessionPose(storage), null);
  assert.doesNotThrow(() => writeSpaceSessionPose(storage, { position: [0, 1, 0], yawRad: 0, pitchRad: 0 }));
});
