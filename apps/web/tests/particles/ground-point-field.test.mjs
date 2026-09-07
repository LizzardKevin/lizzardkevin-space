import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  createGroundPointField,
  GROUND_DEFAULTS,
  groundRadiusForViewDistance,
} from "../../src/particles/groundPointField.ts";

const particlesDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/particles");

// 三件作品缓存的实测取景视距(由 .particles.bin bounds 按 renderer 取景公式算出)。
const WORK_DISTANCES = {
  arch_treehabitat: 12.588,
  arch_uabb_exhibit: 13.353,
  arch_3d_printing_architecture: 1.895,
};

test("ground radius normalizes to view distance (constant angular size across works)", () => {
  const factor = groundRadiusForViewDistance(1);
  assert.ok(factor > 4 && factor < 6, `view factor ${factor} should stay near the 4.76 calibration`);
  for (const [id, distance] of Object.entries(WORK_DISTANCES)) {
    const radius = groundRadiusForViewDistance(distance);
    // 角大小 = radius / distance 恒定 → 屏幕空间地面密度跨作品一致(点数恒定 25k)。
    assert.ok(
      Math.abs(radius / distance - factor) < 1e-9,
      `${id}: radius/distance must equal the shared view factor`,
    );
  }
  // Tree Habitat 标定点:半径保持 ≈60(现状视觉不变)。
  assert.ok(
    Math.abs(groundRadiusForViewDistance(WORK_DISTANCES.arch_treehabitat) - 60) < 0.5,
    "treehabitat ground radius must stay at the calibrated ≈60",
  );
  // 小模型收敛到同角大小:3d 打印从 60 收到 ≈9。
  const smallRadius = groundRadiusForViewDistance(WORK_DISTANCES.arch_3d_printing_architecture);
  assert.ok(smallRadius > 8 && smallRadius < 10, `3d printing radius ${smallRadius} outside 8-10`);
  // 退化输入防护:零/负视距不出负半径。
  assert.equal(groundRadiusForViewDistance(0), 0);
  assert.equal(groundRadiusForViewDistance(-3), 0);
});

test("ground field: deterministic per seed, honors explicit radius and y level", () => {
  const radius = groundRadiusForViewDistance(WORK_DISTANCES.arch_3d_printing_architecture);
  const a = createGroundPointField(-0.21, GROUND_DEFAULTS.pointCount, radius);
  const b = createGroundPointField(-0.21, GROUND_DEFAULTS.pointCount, radius);
  assert.deepEqual(a.positions, b.positions, "same seed must produce identical positions");
  assert.deepEqual(a.fades, b.fades, "same seed must produce identical fades");
  assert.equal(a.pointCount, GROUND_DEFAULTS.pointCount);
  for (let i = 0; i < a.pointCount; i += 1) {
    const x = a.positions[i * 3];
    const y = a.positions[i * 3 + 1];
    const z = a.positions[i * 3 + 2];
    assert.ok(Math.abs(y - -0.21) < 1e-6, "all ground points sit on the requested y level");
    assert.ok(Math.hypot(x, z) <= radius + 1e-6, "points stay within the normalized radius");
    assert.ok(a.fades[i] >= 0 && a.fades[i] <= 1, "fades stay in 0..1 (rim dissolves to 0)");
    assert.equal(a.normals[i * 3 + 1], 1, "ground normals all point up");
  }
  // 归一化只缩放半径,不改变相对分布:同 seed 下 r/R 与 fades 序列与半径无关。
  const big = createGroundPointField(-0.21, GROUND_DEFAULTS.pointCount, radius * 2);
  for (const i of [0, 7, 123, 4096, GROUND_DEFAULTS.pointCount - 1]) {
    const rA = Math.hypot(a.positions[i * 3], a.positions[i * 3 + 2]) / radius;
    const rB = Math.hypot(big.positions[i * 3], big.positions[i * 3 + 2]) / (radius * 2);
    assert.ok(Math.abs(rA - rB) < 1e-6, "normalized radial distribution is scale-invariant");
    assert.ok(Math.abs(a.fades[i] - big.fades[i]) < 1e-6, "fade profile is scale-invariant");
  }
});

test("renderer wiring: ground radius derives from view distance, count stays the shared default", () => {
  const renderer = readFileSync(resolve(particlesDir, "ParticlePointsRenderer.ts"), "utf8").replace(
    /\r\n/g,
    "\n",
  );
  assert.match(
    renderer,
    /createGroundPointField\(groundY, GROUND_DEFAULTS\.pointCount, groundRadiusForViewDistance\(distance\)\)/,
    "setParticleData must pass the distance-normalized radius and the shared point count",
  );
});
