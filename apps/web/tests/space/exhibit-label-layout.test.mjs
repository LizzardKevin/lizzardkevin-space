import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

test("exhibit target labels clamp projected screen points inside the viewport", async () => {
  const layout = await importSourceModule("exhibits/exhibitTargetLabelLayout.ts");
  const viewport = { width: 1920, height: 1080 };

  assert.deepEqual(
    layout.clampExhibitLabelScreenPoint({ x: -140, y: 24 }, viewport, 32, { width: 180, height: 40 }),
    { x: 122, y: 52 },
  );
  assert.deepEqual(
    layout.clampExhibitLabelScreenPoint({ x: 2180, y: 1220 }, viewport, 32, { width: 180, height: 40 }),
    { x: 1798, y: 1028 },
  );
  assert.deepEqual(
    layout.clampExhibitLabelScreenPoint({ x: 960, y: 540 }, viewport, 32),
    { x: 960, y: 540 },
  );
});

test("exhibit target labels recompute their anchor from the current mesh bounds", async () => {
  const THREE = await import("three");
  const target = await importSourceModule("exhibits/exhibitTarget.ts");

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.1));
  mesh.position.set(1, 2, 3);
  mesh.updateMatrixWorld(true);

  const initial = target.computeExhibitLabelAnchor(mesh);
  assert.ok(Math.abs(initial.x - 1) < 1e-9);
  assert.ok(Math.abs(initial.y - 2.7) < 1e-9);
  assert.ok(Math.abs(initial.z - 3) < 1e-9);

  mesh.position.set(1, 4, 3);
  mesh.updateMatrixWorld(true);

  const moved = target.computeExhibitLabelAnchor(mesh);
  assert.ok(Math.abs(moved.y - 4.7) < 1e-9);
  assert.notEqual(moved.y, initial.y);
});
