import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  bakeParticleCache,
  createTriangleSampler,
  parseParticleBin,
  sampleParticles,
  PARTICLE_BIN_FORMAT_VERSION,
  PARTICLE_BIN_HEADER_BYTES,
  PARTICLE_BIN_POINT_FLOATS,
} from "../../../../scripts/bake-particle-visual-cache.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const GLB_PATH = resolve(REPO_ROOT, "apps/web/public/exhibits/arch_treehabitat/focus_arch_treehabitat.glb");
const SHARED_COUNT = 2000;
const SHARED_SEED = 1234;

function sha256Hex(data) {
  return createHash("sha256").update(data).digest("hex");
}

let sharedBake;
function getSharedBake() {
  sharedBake ??= bakeParticleCache({ inputPath: GLB_PATH, count: SHARED_COUNT, seed: SHARED_SEED });
  return sharedBake;
}

test("same input and seed produce byte-identical output; a different seed differs", () => {
  const first = getSharedBake();
  const second = bakeParticleCache({ inputPath: GLB_PATH, count: SHARED_COUNT, seed: SHARED_SEED });
  assert.equal(sha256Hex(second.bin), sha256Hex(first.bin), "same input + same seed must be deterministic");
  const otherSeed = bakeParticleCache({ inputPath: GLB_PATH, count: SHARED_COUNT, seed: SHARED_SEED + 1 });
  assert.notEqual(sha256Hex(otherSeed.bin), sha256Hex(first.bin), "a different seed must change the output");
});

test("point count, finite positions inside bounds, unit normals, rand in [0,1)", () => {
  const { bin } = getSharedBake();
  assert.equal(bin.length, PARTICLE_BIN_HEADER_BYTES + SHARED_COUNT * PARTICLE_BIN_POINT_FLOATS * 4);
  const parsed = parseParticleBin(bin);
  assert.equal(parsed.pointCount, SHARED_COUNT);
  const tolerance = 1e-4;
  for (let point = 0; point < parsed.pointCount; point++) {
    const base = point * PARTICLE_BIN_POINT_FLOATS;
    const px = parsed.data[base];
    const py = parsed.data[base + 1];
    const pz = parsed.data[base + 2];
    const nx = parsed.data[base + 3];
    const ny = parsed.data[base + 4];
    const nz = parsed.data[base + 5];
    const rand = parsed.data[base + 6];
    for (const value of [px, py, pz, nx, ny, nz, rand]) {
      assert.ok(Number.isFinite(value), `point ${point} contains a non-finite value`);
    }
    assert.ok(px >= parsed.boundsMin[0] - tolerance && px <= parsed.boundsMax[0] + tolerance, `point ${point} x outside bounds`);
    assert.ok(py >= parsed.boundsMin[1] - tolerance && py <= parsed.boundsMax[1] + tolerance, `point ${point} y outside bounds`);
    assert.ok(pz >= parsed.boundsMin[2] - tolerance && pz <= parsed.boundsMax[2] + tolerance, `point ${point} z outside bounds`);
    const normalLength = Math.hypot(nx, ny, nz);
    assert.ok(Math.abs(normalLength - 1) <= 1e-3, `point ${point} normal length ${normalLength} is not unit`);
    assert.ok(rand >= 0 && rand < 1, `point ${point} rand ${rand} is outside [0,1)`);
  }
});

test("the input GLB is opened read-only and stays byte-identical", () => {
  const before = sha256Hex(readFileSync(GLB_PATH));
  bakeParticleCache({ inputPath: GLB_PATH, count: 256, seed: 42 });
  const after = sha256Hex(readFileSync(GLB_PATH));
  assert.equal(after, before, "sampling must not modify the input GLB");
});

test("degenerate triangles are skipped, counted, and never produce NaN", () => {
  // One collinear (zero-area) triangle plus one valid triangle, normals omitted
  // on purpose so the face-normal fallback is exercised too.
  const positions = new Float32Array([
    0, 0, 0, 1, 0, 0, 2, 0, 0, // collinear -> degenerate
    0, 0, 0, 1, 0, 0, 0, 1, 0, // valid
  ]);
  const sampler = createTriangleSampler(positions, null);
  assert.equal(sampler.degenerateTriangles, 1);
  assert.equal(sampler.triangleCount, 1);
  const sampled = sampleParticles(sampler, { count: 500, seed: 7 });
  assert.equal(sampled.data.length, 500 * PARTICLE_BIN_POINT_FLOATS);
  for (let i = 0; i < sampled.data.length; i++) {
    assert.ok(Number.isFinite(sampled.data[i]), `sampled value #${i} is not finite`);
  }
  for (let point = 0; point < 500; point++) {
    const base = point * PARTICLE_BIN_POINT_FLOATS;
    const normalLength = Math.hypot(sampled.data[base + 3], sampled.data[base + 4], sampled.data[base + 5]);
    assert.ok(Math.abs(normalLength - 1) <= 1e-3, `fallback normal of point ${point} is not unit`);
  }
});

test("report carries every contract field and written files match the in-memory result", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "particle-bake-test-"));
  try {
    const outputPath = join(tempRoot, "nested", "out.particles.bin");
    const reportPath = join(tempRoot, "nested", "deeper", "report.json");
    const { bin, report } = bakeParticleCache({
      inputPath: GLB_PATH,
      outputPath,
      reportPath,
      count: 128,
      seed: 99,
    });
    assert.ok(existsSync(outputPath), "output directory must be created recursively");
    assert.ok(existsSync(reportPath), "report directory must be created recursively");
    assert.deepEqual(readFileSync(outputPath), bin, "written bin must match the returned bin");
    const fromDisk = JSON.parse(readFileSync(reportPath, "utf8"));
    for (const key of [
      "formatVersion", "input", "output", "seed", "pointCount", "bounds",
      "meshCount", "primitiveCount", "excludedNodes", "degenerateTriangles", "warnings", "generatedAt",
    ]) {
      assert.ok(key in fromDisk, `report is missing field "${key}"`);
    }
    for (const key of ["path", "sha256", "bytes"]) {
      assert.ok(key in fromDisk.input, `report.input is missing "${key}"`);
      assert.ok(key in fromDisk.output, `report.output is missing "${key}"`);
    }
    assert.equal(fromDisk.formatVersion, PARTICLE_BIN_FORMAT_VERSION);
    assert.equal(fromDisk.pointCount, 128);
    assert.equal(fromDisk.seed, 99);
    assert.equal(fromDisk.input.path, GLB_PATH);
    assert.equal(fromDisk.input.sha256, sha256Hex(readFileSync(GLB_PATH)));
    assert.equal(fromDisk.input.bytes, readFileSync(GLB_PATH).length);
    assert.equal(fromDisk.output.path, outputPath);
    assert.equal(fromDisk.output.sha256, sha256Hex(bin));
    assert.equal(fromDisk.output.bytes, bin.length);
    assert.ok(Array.isArray(fromDisk.bounds.min) && fromDisk.bounds.min.length === 3);
    assert.ok(Array.isArray(fromDisk.bounds.max) && fromDisk.bounds.max.length === 3);
    assert.ok(Array.isArray(fromDisk.excludedNodes));
    assert.ok(Array.isArray(fromDisk.warnings));
    assert.equal(typeof fromDisk.degenerateTriangles, "number");
    assert.ok(!Number.isNaN(Date.parse(fromDisk.generatedAt)), "generatedAt must be an ISO timestamp");
    assert.equal(report.output.sha256, fromDisk.output.sha256);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("bin header round-trips through parseParticleBin and bad magic is rejected", () => {
  const { bin, report } = getSharedBake();
  const parsed = parseParticleBin(bin);
  assert.equal(bin.toString("ascii", 0, 4), "PVB1");
  assert.equal(parsed.formatVersion, PARTICLE_BIN_FORMAT_VERSION);
  assert.equal(parsed.pointCount, report.pointCount);
  for (let i = 0; i < 3; i++) {
    assert.equal(parsed.boundsMin[i], report.bounds.min[i]);
    assert.equal(parsed.boundsMax[i], report.bounds.max[i]);
  }
  assert.equal(parsed.data.length, report.pointCount * PARTICLE_BIN_POINT_FLOATS);
  const corrupted = Buffer.from(bin);
  corrupted.write("XXXX", 0, "ascii");
  assert.throws(() => parseParticleBin(corrupted), /bad magic/);
});
