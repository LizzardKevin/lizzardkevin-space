import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";

/**
 * 投影仪/展品 raycast 遮挡判定的核心假设：
 * 1. three Raycaster 能命中 visible=false 的 COL_ 碰撞网格（物理遮挡语义的载体）。
 * 2. 距离比较：遮挡物更近 → 阻挡；遮挡物更远 → 直射通过。
 * 与 ExhibitRaycast 中的判定逻辑同构（OCCLUSION_EPSILON = 0.05）。
 */

const OCCLUSION_EPSILON = 0.05;

function makeWall(name, z, visible = false) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 0.1), new THREE.MeshBasicMaterial());
  wall.name = name;
  wall.position.set(0, 0, z);
  wall.visible = visible;
  wall.updateMatrixWorld(true);
  return wall;
}

function makeTarget(z) {
  const target = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  target.name = "PROJECTOR_WALL_IMAGE";
  target.position.set(0, 0, z);
  target.updateMatrixWorld(true);
  return target;
}

function raycastFromCamera(camera, objects) {
  const raycaster = new THREE.Raycaster();
  raycaster.near = 0;
  raycaster.far = 30;
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  return raycaster.intersectObjects(objects, false);
}

function setup() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  return { scene, camera };
}

test("raycaster hits invisible COL_ meshes (occlusion carriers stay raycastable)", () => {
  const { scene, camera } = setup();
  const wall = makeWall("COL_WALL", 5, false);
  scene.add(wall);
  const hits = raycastFromCamera(camera, [wall]);
  assert.equal(hits.length > 0, true, "invisible COL_ mesh must still block interaction rays");
});

test("a COL_ wall closer than the projector blocks the direct line of sight", () => {
  const { scene, camera } = setup();
  const wall = makeWall("COL_WALL", 5, false);
  const target = makeTarget(2);
  scene.add(wall, target);

  const targetHits = raycastFromCamera(camera, [target]);
  const blockerHits = raycastFromCamera(camera, [wall]);
  assert.equal(targetHits.length > 0, true);
  assert.equal(blockerHits.length > 0, true);
  assert.equal(
    blockerHits[0].distance < targetHits[0].distance - OCCLUSION_EPSILON,
    true,
    "wall at z=5 is closer than projector at z=2 and must occlude it",
  );
});

test("a COL_ wall farther than the projector does not occlude it", () => {
  const { scene, camera } = setup();
  const wall = makeWall("COL_WALL", 1, false);
  const target = makeTarget(5);
  scene.add(wall, target);

  const targetHits = raycastFromCamera(camera, [target]);
  const blockerHits = raycastFromCamera(camera, [wall]);
  assert.equal(targetHits.length > 0, true);
  assert.equal(blockerHits.length > 0, true);
  assert.equal(
    blockerHits[0].distance < targetHits[0].distance - OCCLUSION_EPSILON,
    false,
    "wall behind the projector must not occlude it",
  );
});

test("non-COL objects are excluded from the occluder set by name convention", () => {
  const { scene } = setup();
  scene.add(makeWall("COL_WALL_A", 3), makeWall("PROJECTOR_WALL_IMAGE", 4), makeWall("GLASS_01", 5));

  const colMeshes = [];
  scene.traverse((obj) => {
    if (obj.isMesh && obj.name.startsWith("COL_")) {
      colMeshes.push(obj);
    }
  });
  assert.equal(colMeshes.length, 1);
  assert.equal(colMeshes[0].name, "COL_WALL_A");
});
