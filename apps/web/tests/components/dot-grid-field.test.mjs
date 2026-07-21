import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDotGridPoints,
  DOT_GRID_BASE_DOT_PX,
  DOT_GRID_FIELD_RADIUS_PX,
  DOT_GRID_MAX_DOT_PX,
  DOT_GRID_MAX_PULL_PX,
  resolveDotFieldCurve,
  resolveDotFieldDotPlacement,
  resolveDotFieldDotSize,
  resolveDotFieldInfluence,
  resolveDotFieldPull,
} from "../../src/components/dotGridField.ts";

test("dot grid builder covers the surface at the requested spacing", () => {
  const points = buildDotGridPoints(44, 44, 22);
  assert.deepEqual(points, [
    { x: 11, y: 11 },
    { x: 33, y: 11 },
    { x: 11, y: 33 },
    { x: 33, y: 33 },
  ]);
  assert.equal(buildDotGridPoints(0, 100, 22).length, 0);
  assert.equal(buildDotGridPoints(100, 100, 0).length, 0);
});

test("dot field influence fades from 1 at the pointer to 0 outside the radius", () => {
  assert.equal(resolveDotFieldInfluence(0, 220), 1);
  assert.equal(resolveDotFieldInfluence(220, 220), 0);
  assert.equal(resolveDotFieldInfluence(320, 220), 0);
  assert.equal(resolveDotFieldInfluence(10, 0), 0);
  const mid = resolveDotFieldInfluence(110, 220);
  assert.ok(mid > 0.4 && mid < 0.6, `mid influence should track distance, got ${mid}`);
});

test("dot field curve matches the lobby smoothstep-squared easing", () => {
  assert.equal(resolveDotFieldCurve(0), 0);
  assert.equal(resolveDotFieldCurve(1), 1);
  assert.equal(resolveDotFieldCurve(0.5), 0.25);
  assert.ok(resolveDotFieldCurve(0.25) < 0.05, "curve should suppress faint influence");
});

test("dot field pull and size stay inside their budgets", () => {
  assert.equal(resolveDotFieldPull(9999, 220), 0);
  assert.equal(resolveDotFieldPull(0, 220), DOT_GRID_MAX_PULL_PX);
  assert.ok(resolveDotFieldPull(110, 220) < DOT_GRID_MAX_PULL_PX);
  assert.equal(resolveDotFieldDotSize(9999, 220), DOT_GRID_BASE_DOT_PX);
  assert.equal(resolveDotFieldDotSize(0, 220), DOT_GRID_MAX_DOT_PX);
});

test("dot placement flies toward the pointer and grows with the lobby falloff", () => {
  const pointer = { x: 100, y: 100, strength: 1 };
  const atPointer = resolveDotFieldDotPlacement({ x: 100, y: 100 }, pointer, DOT_GRID_FIELD_RADIUS_PX);
  assert.equal(atPointer.size, DOT_GRID_MAX_DOT_PX);

  const near = resolveDotFieldDotPlacement({ x: 60, y: 100 }, pointer, DOT_GRID_FIELD_RADIUS_PX);
  assert.ok(near.x > 60, "dot should be pulled toward the pointer");
  assert.ok(near.x < 100, "dot should not overshoot the pointer");
  assert.ok(near.size > DOT_GRID_BASE_DOT_PX, "near dot should grow");

  const far = resolveDotFieldDotPlacement({ x: 100 + DOT_GRID_FIELD_RADIUS_PX, y: 100 }, pointer, DOT_GRID_FIELD_RADIUS_PX);
  assert.deepEqual(far, { x: 100 + DOT_GRID_FIELD_RADIUS_PX, y: 100, size: DOT_GRID_BASE_DOT_PX });
});

test("dot placement stays home while the field strength is zero", () => {
  const placement = resolveDotFieldDotPlacement({ x: 42, y: 24 }, { x: 40, y: 20, strength: 0 }, DOT_GRID_FIELD_RADIUS_PX);
  assert.deepEqual(placement, { x: 42, y: 24, size: DOT_GRID_BASE_DOT_PX });
});
