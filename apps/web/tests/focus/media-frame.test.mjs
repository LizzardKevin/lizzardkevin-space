import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { importSourceModule } from "../helpers/projectPaths.mjs";

test("focus media rail loops through model and exhibit images", async () => {
  const { getFocusMediaItems, nextFocusMediaIndex, resolveFocusMediaDragStep } =
    await importSourceModule("exhibits/focusMedia.ts");

  const items = getFocusMediaItems({
    exhibitId: "work_001",
    focusGlbUrl: "/exhibits/work_001/focus_work_001.glb",
    type: "model3d",
    media: {
      imageUrls: ["/exhibits/work_001/a.jpg", "/exhibits/work_001/b.jpg"],
    },
  });

  assert.deepEqual(items, [
    { kind: "model", url: "/exhibits/work_001/focus_work_001.glb" },
    { kind: "image", url: "/exhibits/work_001/a.jpg" },
    { kind: "image", url: "/exhibits/work_001/b.jpg" },
  ]);
  assert.equal(nextFocusMediaIndex(0, -1, items.length), 2);
  assert.equal(nextFocusMediaIndex(2, 1, items.length), 0);
  assert.equal(nextFocusMediaIndex(0, 1, 1), 0);

  assert.equal(resolveFocusMediaDragStep("image", -68, 4), 1);
  assert.equal(resolveFocusMediaDragStep("image", 68, 4), -1);
  assert.equal(resolveFocusMediaDragStep("image", 12, 4), 0);
  assert.equal(resolveFocusMediaDragStep("image", -68, 80), 0);
  assert.equal(resolveFocusMediaDragStep("model", -68, 4), 0);
});

test("fitFocusModelToFrame rotates around the whole model bounding-box center", async () => {
  const { fitFocusModelToFrame } = await importSourceModule("exhibits/focusModelFrame.ts");

  const root = new THREE.Group();
  const left = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
  left.position.set(-4, 0, 0);
  const right = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2));
  right.position.set(2, 0, 0);
  const stalePivot = new THREE.Object3D();
  stalePivot.name = "focus_pivot";
  stalePivot.position.set(12, 0, 0);
  root.add(left, right, stalePivot);

  fitFocusModelToFrame(root);
  root.updateMatrixWorld(true);

  const center = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
  assert.ok(Math.abs(center.x) < 0.0001, `x center should be 0, got ${center.x}`);
  assert.ok(Math.abs(center.y) < 0.0001, `y center should be 0, got ${center.y}`);
  assert.ok(Math.abs(center.z) < 0.0001, `z center should be 0, got ${center.z}`);

  const frame = fitFocusModelToFrame(root);
  assert.deepEqual(frame.orbitTarget, [0, 0, 0]);
  assert.equal(frame.cameraPosition[1], 0);
});
