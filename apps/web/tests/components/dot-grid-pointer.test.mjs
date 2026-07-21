import assert from "node:assert/strict";
import test from "node:test";
import {
  isDotGridValueSettled,
  lerpDotGridValue,
} from "../../src/components/dotGridPointer.ts";

test("dot grid spotlight lerp converges and settles within the threshold", () => {
  let value = 0;
  const target = 100;
  let steps = 0;
  while (!isDotGridValueSettled(value, target) && steps < 200) {
    value = lerpDotGridValue(value, target);
    steps += 1;
  }
  assert.ok(steps > 0 && steps < 200, `lerp should settle in bounded steps, got ${steps}`);
  assert.ok(Math.abs(target - value) < 0.4, "lerp should land within the settle threshold");
  assert.equal(isDotGridValueSettled(99.7, 100), true);
  assert.equal(isDotGridValueSettled(99.0, 100), false);
});
