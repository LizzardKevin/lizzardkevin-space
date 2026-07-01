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

test("exhibit targets carry only raycast identity for UI labels", async () => {
  const THREE = await import("three");
  const target = await importSourceModule("exhibits/exhibitTarget.ts");

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 0.1));
  const exhibitTarget = target.buildExhibitTarget(mesh, "arch_treehabitat");

  assert.equal(exhibitTarget.exhibitId, "arch_treehabitat");
  assert.equal(exhibitTarget.object, mesh);
  assert.equal("labelAnchor" in exhibitTarget, false);
});
