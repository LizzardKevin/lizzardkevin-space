import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { importSourceModule } from "../helpers/projectPaths.mjs";

const {
  resolveSpaceMinimapFloorAt,
  SPACE_MINIMAP_FEET_OFFSET,
} = await importSourceModule("space/minimap/minimapFloorDetect.ts");

function piece(name, kind, min, max) {
  return {
    name,
    kind,
    geometry: new THREE.BufferGeometry(),
    bounds: new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max)),
  };
}

// pose.y 是胶囊中心;脚底 = y + FEET_OFFSET
const poseAtFeet = (feetY, x = 0, z = 0) => [x, feetY - SPACE_MINIMAP_FEET_OFFSET, z];

test("站在唯一楼板上时命中该板", () => {
  const pieces = [piece("floor_a", "floor", [-2, -0.5, -2], [2, 0, 2])];
  assert.equal(resolveSpaceMinimapFloorAt(pieces, poseAtFeet(0)), "floor_a");
});

test("多层重叠时取顶面不超过脚底的最高一块", () => {
  const pieces = [
    piece("floor_low", "floor", [-2, -0.5, -2], [2, 0, 2]),
    piece("floor_high", "floor", [-2, 4.5, -2], [2, 5, 2]),
  ];
  assert.equal(resolveSpaceMinimapFloorAt(pieces, poseAtFeet(5)), "floor_high");
  assert.equal(resolveSpaceMinimapFloorAt(pieces, poseAtFeet(0)), "floor_low");
  assert.equal(
    resolveSpaceMinimapFloorAt(pieces, poseAtFeet(1)),
    "floor_low",
    "夹层下方行走时,头顶夹层板(顶面高于脚底容差)不被点亮",
  );
});

test("跳跃/悬空时保持点亮脚底之下最高的板(空域归属)", () => {
  const pieces = [piece("floor_low", "floor", [-2, -0.5, -2], [2, 0, 2])];
  assert.equal(resolveSpaceMinimapFloorAt(pieces, poseAtFeet(0.3)), "floor_low", "小跳仍归属该板");
  assert.equal(resolveSpaceMinimapFloorAt(pieces, poseAtFeet(3)), "floor_low", "明显高于时也取脚下最高板");
});

test("楼梯段按竖直跨度判定且优先于楼板", () => {
  const pieces = [
    piece("floor_below", "floor", [-3, -0.5, -3], [3, 0, 3]),
    piece("stair_a", "stair", [-1, 0, -1], [1, 3, 1]),
  ];
  assert.equal(
    resolveSpaceMinimapFloorAt(pieces, poseAtFeet(1.5)),
    "stair_a",
    "坡道中段脚底介于梯段顶底之间,命中楼梯而非脚下投影的楼板",
  );
  assert.equal(resolveSpaceMinimapFloorAt(pieces, poseAtFeet(0)), "stair_a", "梯段底端起步仍算在楼梯上");
});

test("离开梯段竖直跨度后回落到楼板判定", () => {
  const pieces = [
    piece("floor_below", "floor", [-3, -0.5, -3], [3, 0, 3]),
    piece("stair_a", "stair", [-1, 0, -1], [1, 3, 1]),
  ];
  assert.equal(
    resolveSpaceMinimapFloorAt(pieces, poseAtFeet(10)),
    "floor_below",
    "远高于梯段时回落到脚下最高的楼板",
  );
});

test("水平面在包围盒外不命中,贴边外扩内容忍", () => {
  const pieces = [piece("floor_a", "floor", [-2, -0.5, -2], [2, 0, 2])];
  assert.equal(resolveSpaceMinimapFloorAt(pieces, poseAtFeet(0, 5, 0)), null);
  assert.equal(resolveSpaceMinimapFloorAt(pieces, poseAtFeet(0, 2.04, 0)), "floor_a");
});

test("无步行面或空列表返回 null", () => {
  assert.equal(resolveSpaceMinimapFloorAt([], poseAtFeet(0)), null);
});
