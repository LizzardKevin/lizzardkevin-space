import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { importSourceModule } from "../helpers/projectPaths.mjs";

function roundedTuple(tuple) {
  return tuple.map((value) => Number(value.toFixed(3)));
}

test("resolveGallerySpawn offsets spawn_player_main forward and grounds the offset point", async () => {
  const spawnModule = await importSourceModule("scenes/gallery/resolveGallerySpawn.ts");
  const galleryConfig = await importSourceModule("scenes/gallery/galleryConfig.ts");

  const root = new THREE.Group();

  const floor = new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 4));
  floor.name = "COL_floor_lower";
  floor.position.set(0, 0, galleryConfig.GALLERY_SPAWN_FORWARD_OFFSET_M);
  root.add(floor);

  const raisedRing = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 2, 32),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  raisedRing.name = "COL_floor_raised_ring";
  raisedRing.position.y = 5;
  raisedRing.rotation.x = -Math.PI / 2;
  root.add(raisedRing);

  const marker = new THREE.Object3D();
  marker.name = "spawn_player_main";
  marker.position.set(0, 10, 0);
  root.add(marker);
  root.updateMatrixWorld(true);

  const spawn = spawnModule.resolveGallerySpawn(root);
  const expectedY = 0.25 + spawnModule.PLAYER_FOOT_OFFSET + 0.02;

  assert.deepEqual(roundedTuple(spawn), [
    0,
    Number(expectedY.toFixed(3)),
    galleryConfig.GALLERY_SPAWN_FORWARD_OFFSET_M,
  ]);
});

test("gallery fallback spawn starts at grounded body height", async () => {
  const spawnModule = await importSourceModule("scenes/gallery/resolveGallerySpawn.ts");
  const galleryConfig = await importSourceModule("scenes/gallery/galleryConfig.ts");

  const floorTopY = 35.976776;
  const expectedBodyY = floorTopY + spawnModule.PLAYER_FOOT_OFFSET + 0.02;

  assert.deepEqual(
    roundedTuple(galleryConfig.GALLERY_SPAWN),
    [-0.51, Number(expectedBodyY.toFixed(3)), -37.018],
  );
  assert.equal(galleryConfig.GALLERY_SPAWN_FORWARD_OFFSET_M, 11.3);
});
