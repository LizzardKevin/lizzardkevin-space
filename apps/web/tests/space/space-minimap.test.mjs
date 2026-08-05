import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { importSourceModule } from "../helpers/projectPaths.mjs";

const {
  buildSpaceMinimapModel,
  collectSpaceMinimapSources,
} = await importSourceModule("space/minimap/minimapModel.ts");
const {
  dampSpaceMinimapAngleRad,
  fitSpaceMinimapCamera,
  spaceMinimapAzimuthForYaw,
  SPACE_MINIMAP_ELEVATION_RAD,
  SPACE_MINIMAP_VIEW_MARGIN,
} = await importSourceModule("space/minimap/minimapCamera.ts");

const TWO_PI = Math.PI * 2;

function namedBox(name, position, size = 1) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshBasicMaterial());
  mesh.name = name;
  mesh.position.set(position[0], position[1], position[2]);
  return mesh;
}

function buildSyntheticGallery() {
  const root = new THREE.Group();
  root.name = "synthetic_gallery";
  root.add(namedBox("ARCH_WALL_A", [0, 2, 0]));
  root.add(namedBox("STRUCT_FLOOR_A", [6, 0, 0], 2));
  root.add(namedBox("GLASS_SKYLIGHT_A", [0, 6, 0]));
  root.add(namedBox("METAL_ALUMINUM_RAIL_A", [0, 0, 6]));
  const hiddenArchitecture = namedBox("ARCH_WALL_HIDDEN", [40, 0, 0]);
  hiddenArchitecture.visible = false;
  root.add(hiddenArchitecture);
  root.add(namedBox("COL_ground", [0, -6, 0]));
  root.add(namedBox("EXHIBITS_Frame_A", [0, 0, -6]));
  root.add(namedBox("bulb_a", [1, 3, 1]));
  root.updateMatrixWorld(true);
  return root;
}

test("collection keeps visible architecture/glass/metal and drops colliders, exhibits, lights, hidden meshes", () => {
  const { holo, ink } = collectSpaceMinimapSources(buildSyntheticGallery());
  assert.equal(holo.length, 4, "ARCH_ + STRUCT_ + GLASS_ + METAL_ALUMINUM_ kept");
  assert.equal(ink.length, 1, "只有 stylize 且非地面/楼梯的建筑面进墨线(ARCH_WALL_A)");
});

test("model build merges kept meshes into one world-space geometry with bounds", () => {
  const model = buildSpaceMinimapModel(buildSyntheticGallery());
  assert.ok(model, "model should build");

  const boxPositionCount = new THREE.BoxGeometry(1, 1, 1).getAttribute("position").count;
  assert.equal(
    model.holoGeometry.getAttribute("position").count,
    boxPositionCount * 3 + new THREE.BoxGeometry(2, 2, 2).getAttribute("position").count,
    "holo geometry merges exactly the kept meshes",
  );

  assert.ok(model.radius > 0);
  const center = model.center;
  assert.ok(Math.abs(center.x - 3) < 3.5, "center 落在保留网格的几何范围内(不含 x=40 隐藏块)");
  assert.ok(center.x < 10, "隐藏/剔除网格不应拉偏包围球");

  assert.ok(model.inkGeometry, "ink shell exists for stylize architecture");
  const inkPositions = model.inkGeometry.getAttribute("position").count;
  assert.equal(inkPositions, 8, "单个 box 的焊接墨线壳为 8 顶点");

  model.holoGeometry.dispose();
  model.inkGeometry.dispose();
});

test("model build returns null when nothing matches the prefixes", () => {
  const root = new THREE.Group();
  root.add(namedBox("COL_only", [0, 0, 0]));
  root.updateMatrixWorld(true);
  assert.equal(buildSpaceMinimapModel(root), null);
});

test("azimuth mapping is the identity (heading-up follows player yaw)", () => {
  assert.equal(spaceMinimapAzimuthForYaw(0), 0);
  assert.equal(spaceMinimapAzimuthForYaw(1.23), 1.23);
  assert.equal(spaceMinimapAzimuthForYaw(-2.5), -2.5);
});

test("angle damping takes the shortest wrapped path and converges", () => {
  const start = 0.05;
  const target = TWO_PI - 0.05;
  const stepped = dampSpaceMinimapAngleRad(start, target, 8, 0.016);
  assert.ok(stepped < start, "环绕 ±π 处应向负方向走最短路径");
  assert.ok(stepped > start - 0.2, "首帧步长受阻尼限制");

  let value = start;
  for (let i = 0; i < 400; i++) value = dampSpaceMinimapAngleRad(value, target, 8, 1 / 60);
  const wrapped = ((value % TWO_PI) + TWO_PI) % TWO_PI;
  assert.ok(Math.abs(wrapped - target) < 1e-3, "阻尼最终收敛到目标角");

  const frozen = dampSpaceMinimapAngleRad(1, 1, 8, 0.016);
  assert.equal(frozen, 1, "目标不变时角度保持");
});

test("ortho camera fit frames the bounding sphere with margin and the fixed elevation", () => {
  const camera = new THREE.OrthographicCamera();
  const center = new THREE.Vector3(1, 37, -48);
  const radius = 24;
  const aspect = 1;
  fitSpaceMinimapCamera(camera, center, radius, 0.4, aspect);

  assert.ok(Math.abs(camera.top - radius * SPACE_MINIMAP_VIEW_MARGIN) < 1e-6);
  assert.ok(Math.abs(camera.right - radius * SPACE_MINIMAP_VIEW_MARGIN * aspect) < 1e-6);
  assert.ok(camera.far > camera.near);

  const offset = camera.position.clone().sub(center);
  const distance = offset.length();
  const elevation = Math.asin(offset.y / distance);
  assert.ok(
    Math.abs(elevation - SPACE_MINIMAP_ELEVATION_RAD) < 1e-6,
    "相机仰角固定,保证地图读感一致",
  );
  assert.ok(distance > radius, "相机位于体量之外");
});

test("camera azimuth rotates the view around the model", () => {
  const camera = new THREE.OrthographicCamera();
  const center = new THREE.Vector3(0, 0, 0);
  fitSpaceMinimapCamera(camera, center, 10, 0, 1);
  const atZero = camera.position.clone();
  fitSpaceMinimapCamera(camera, center, 10, Math.PI / 2, 1);
  const atQuarter = camera.position.clone();
  assert.ok(atZero.distanceTo(atQuarter) > 1, "方位角变化驱动地图旋转");
  assert.ok(Math.abs(atZero.length() - atQuarter.length()) < 1e-6, "旋转不改变距离");
});
