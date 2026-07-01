import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

test("exhibit target labels render below the center cursor in canvas UI", async () => {
  const layout = await importSourceModule("exhibits/exhibitTargetLabelLayout.ts");
  const viewport = { width: 1920, height: 1080 };

  assert.deepEqual(
    layout.resolveExhibitLabelUiPosition(viewport, 30),
    { x: 960, y: 570 },
  );
  assert.deepEqual(
    layout.resolveExhibitLabelUiPosition({ width: 1366, height: 768 }, 30),
    { x: 683, y: 414 },
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

test("exhibit target labels can use a world-space anchor supplied by onboarding hit meshes", async () => {
  const THREE = await import("three");
  const target = await importSourceModule("exhibits/exhibitTarget.ts");

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.4));
  mesh.position.set(-0.55, 37.6, -39.6);
  mesh.userData.exhibitLabelAnchor = [-0.55, 38.18, -39.6];
  mesh.updateMatrixWorld(true);

  const anchor = target.computeExhibitLabelAnchor(mesh);

  assert.ok(Math.abs(anchor.x + 0.55) < 1e-9);
  assert.ok(Math.abs(anchor.y - 38.18) < 1e-9);
  assert.ok(Math.abs(anchor.z + 39.6) < 1e-9);
});
