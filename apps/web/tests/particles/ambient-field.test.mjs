import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createAmbientPointField } from "../../src/particles/ambientPointField.ts";
import { buildModelParticleArrays } from "../../src/particles/mergeParticleArrays.ts";
import { particleCacheUrlFor } from "../../src/particles/particleCacheLoader.ts";

const particlesDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/particles");

const toBuffer = (array) => Buffer.from(array.buffer, array.byteOffset, array.byteLength);

test("ambient field: same seed produces byte-identical output", () => {
  const first = createAmbientPointField(512, 1234);
  const second = createAmbientPointField(512, 1234);
  assert.ok(toBuffer(second.positions).equals(toBuffer(first.positions)), "same seed must be deterministic");
  const defaultTwice = createAmbientPointField(512);
  assert.ok(
    toBuffer(defaultTwice.positions).equals(toBuffer(createAmbientPointField(512).positions)),
    "default seed must be deterministic",
  );
  const otherSeed = createAmbientPointField(512, 1235);
  assert.ok(!toBuffer(otherSeed.positions).equals(toBuffer(first.positions)), "a different seed must change the output");
});

test("ambient field: no NaN, y in [-4.2, 12], x/z in [-26, 26]", () => {
  const { positions } = createAmbientPointField(5000);
  assert.equal(positions.length, 5000 * 3);
  for (let i = 0; i < positions.length; i += 1) {
    assert.ok(Number.isFinite(positions[i]), `value #${i} is not finite`);
  }
  for (let point = 0; point < 5000; point += 1) {
    const x = positions[point * 3];
    const y = positions[point * 3 + 1];
    const z = positions[point * 3 + 2];
    assert.ok(x >= -26 && x <= 26, `point ${point} x ${x} outside [-26, 26]`);
    assert.ok(y >= -4.2 && y <= 12, `point ${point} y ${y} outside [-4.2, 12]`);
    assert.ok(z >= -26 && z <= 26, `point ${point} z ${z} outside [-26, 26]`);
  }
});

test("buildModelParticleArrays: every model point has an ambient target", () => {
  const model = {
    positions: new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]),
    normals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]),
    rands: new Float32Array([0.1, 0.2, 0.3]),
  };
  const ambient = { positions: new Float32Array([101, 102, 103, 104, 105, 106, 107, 108, 109]) };

  const merged = buildModelParticleArrays(model, 3, ambient);
  assert.equal(merged.totalCount, 3);
  assert.equal(merged.positions.length, 9);
  assert.equal(merged.normals.length, 9);
  assert.equal(merged.rands.length, 3);
  assert.equal(merged.fades.length, 3);
  assert.equal(merged.alts.length, 9);

  // 模型段:positions/normals/rands 原样,fades=1,alts=ambient 前 N 点。
  assert.deepEqual([...merged.positions.subarray(0, 9)], [...model.positions]);
  assert.deepEqual([...merged.normals.subarray(0, 9)], [...model.normals]);
  assert.deepEqual([...merged.rands.subarray(0, 3)], [...model.rands]);
  assert.deepEqual([...merged.fades.subarray(0, 3)], [1, 1, 1]);
  assert.deepEqual([...merged.alts.subarray(0, 9)], [...ambient.positions]);


});

test("buildModelParticleArrays: too-small ambient throws", () => {
  const model = {
    positions: new Float32Array([1, 2, 3]),
    normals: new Float32Array([0, 1, 0]),
    rands: new Float32Array([0.7]),
  };
  const ambient = { positions: new Float32Array([9, 8, 7]) };
  const merged = buildModelParticleArrays(model, 1, ambient);
  assert.equal(merged.totalCount, 1);
  assert.deepEqual([...merged.fades], [1]);
  assert.deepEqual([...merged.alts], [9, 8, 7]);

  assert.throws(
    () => buildModelParticleArrays(model, 1, { positions: new Float32Array([1, 2]) }),
    /Ambient field too small/,
  );
});

test("particleCacheUrlFor: builds the bin URL and rejects unsafe exhibit ids", () => {
  assert.equal(particleCacheUrlFor("arch_treehabitat"), "/particles/arch_treehabitat.particles.bin");
  assert.equal(particleCacheUrlFor("A-1_b"), "/particles/A-1_b.particles.bin");
  for (const bad of ["", "a/b", "../x", "a b", "a.b", "中文"]) {
    assert.throws(() => particleCacheUrlFor(bad), /Invalid particle cache exhibit id/);
  }
});

test("particle material source wires morph: positionAlt attribute and morphProgress uniform", () => {
  const material = readFileSync(resolve(particlesDir, "particlePointsMaterial.ts"), "utf8");
  assert.match(material, /positionAlt/, "material must inject the positionAlt instanced attribute");
  assert.match(material, /morphProgress/, "material must expose the morphProgress uniform");
});

console.log("ambient field tests passed");
