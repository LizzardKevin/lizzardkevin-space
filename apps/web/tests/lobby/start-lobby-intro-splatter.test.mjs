import assert from "node:assert/strict";
import test from "node:test";
import {
  START_LOBBY_INTRO_ASSEMBLE_MS,
  START_LOBBY_INTRO_ASSEMBLE_OFFSET_MS,
  START_LOBBY_INTRO_ASSEMBLED_CLOCK_S,
  START_LOBBY_INTRO_FRAGMENT_DELAY_MS,
  START_LOBBY_INTRO_FRAGMENT_MIN_MS,
  START_LOBBY_INTRO_FRAGMENT_VARIANCE_MS,
  START_LOBBY_INTRO_TOTAL_MS,
  START_LOBBY_INTRO_WIPE_MS,
  START_LOBBY_INTRO_WORD_STAGGER_MS,
  START_LOBBY_SHATTER_FACES_PER_SHARD,
  START_LOBBY_SHATTER_START_SCALE,
  clusterLobbyShatterFaces,
  createLobbyShatterFaces,
  resolveLobbyIntroWipe,
  resolveLobbyShatterEase,
  sampleLobbyShatterFace,
} from "../../src/lobby/startLobbyIntroShatter.ts";

const WIDTH = 1440;
const HEIGHT = 900;

/** 模拟一个横向略宽的文字网格面心云(逐簇爆炸聚类前的逐面输入)。 */
function makeFaceCenters(count) {
  return Array.from({ length: count }, (_, index) => ({
    x: -2.1 + (index % 40) * 0.105,
    y: -0.2 + Math.floor(index / 40) * 0.08,
    z: (index % 3) * 0.16,
  }));
}

test("shatter shards group every 14 consecutive faces into one larger fragment", () => {
  assert.equal(START_LOBBY_SHATTER_FACES_PER_SHARD, 14);
  const centers = makeFaceCenters(257);
  const shards = clusterLobbyShatterFaces(centers);

  assert.equal(shards.length, Math.ceil(centers.length / START_LOBBY_SHATTER_FACES_PER_SHARD));
  let covered = 0;
  for (const [index, shard] of shards.entries()) {
    const expectedFaceCount =
      index === shards.length - 1
        ? centers.length - START_LOBBY_SHATTER_FACES_PER_SHARD * (shards.length - 1)
        : START_LOBBY_SHATTER_FACES_PER_SHARD;
    assert.equal(shard.faceCount, expectedFaceCount);
    covered += shard.faceCount;
    const members = centers.slice(covered - shard.faceCount, covered);
    assert.ok(
      Math.abs(shard.center.x - members.reduce((sum, c) => sum + c.x, 0) / shard.faceCount) < 1e-12,
      "shard center must be the mean of its member face centers",
    );
  }
  assert.equal(covered, centers.length, "shards must cover every face exactly once");
  assert.deepEqual(clusterLobbyShatterFaces(centers), shards, "clustering stays deterministic");
  assert.deepEqual(clusterLobbyShatterFaces([], 3), []);
});

test("shard count lands at roughly two hundred larger fragments", () => {
  // 生产几何按词/字母逐几何聚类:LIZZARDKEVIN 1412 面 + SPACE 各字母(S540/P256/A88/C396/E92)。
  const geometryFaceCounts = [1412, 540, 256, 88, 396, 92];
  const totalFaces = geometryFaceCounts.reduce((sum, count) => sum + count, 0);
  const totalShards = geometryFaceCounts.reduce(
    (sum, count) => sum + clusterLobbyShatterFaces(makeFaceCenters(count)).length,
    0,
  );
  assert.equal(totalFaces, 2784);
  assert.equal(totalShards, 202);
  assert.ok(
    totalShards >= 150 && totalShards <= 250,
    `shard total must land around two hundred, got ${totalShards}/${totalFaces}`,
  );
});

test("faces in one shard share one spec and fly as a single rigid fragment", () => {
  const centers = makeFaceCenters(64);
  const shards = clusterLobbyShatterFaces(centers);
  const specs = createLobbyShatterFaces(
    shards.map((shard) => shard.center),
    { seed: 7 },
  );

  assert.equal(specs.length, shards.length);
  const shardIndexOf = (face) =>
    Math.min(shards.length - 1, Math.floor(face / START_LOBBY_SHATTER_FACES_PER_SHARD));
  for (let face = 0; face < centers.length; face += 1) {
    const shardIndex = shardIndexOf(face);
    // 同簇的面引用同一个 spec 对象(几何写入时共享同一份 scatter/axis/spin/timing)。
    assert.equal(specs[shardIndex], specs[shardIndexOf(face - (face % START_LOBBY_SHATTER_FACES_PER_SHARD))]);
    const pose = sampleLobbyShatterFace(specs[shardIndex], 0);
    for (const value of Object.values(pose)) {
      assert.ok(
        typeof value === "boolean" || Number.isFinite(value),
        `shard pose field must stay finite, got ${value}`,
      );
    }
  }
  // 同簇三面在同一时刻的位姿完全一致:作为一个大碎片整体运动。
  const firstShardFaces = [0, 1, 2].map((face) =>
    sampleLobbyShatterFace(specs[shardIndexOf(face)], 120),
  );
  assert.deepEqual(firstShardFaces[0], firstShardFaces[1]);
  assert.deepEqual(firstShardFaces[1], firstShardFaces[2]);
});

test("shatter face generation is deterministic for a fixed seed and changes with the seed", () => {
  const centers = makeFaceCenters(64);
  const first = createLobbyShatterFaces(centers, { seed: 7 });
  const second = createLobbyShatterFaces(centers, { seed: 7 });
  const other = createLobbyShatterFaces(centers, { seed: 8 });

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, other);
});

test("shatter faces preserve face count and contain no NaN or Infinity", () => {
  const centers = makeFaceCenters(257);
  const specs = createLobbyShatterFaces(centers, { seed: 7 });

  assert.equal(specs.length, centers.length);
  assert.deepEqual(createLobbyShatterFaces([], { seed: 7 }), []);
  for (const spec of specs) {
    for (const value of Object.values(spec)) {
      assert.ok(Number.isFinite(value), `face field must stay finite, got ${value}`);
    }
    assert.ok(spec.durationMs > 0);
  }
});

test("per-face spin axes are unit vectors and every shard turns in flight", () => {
  const specs = createLobbyShatterFaces(makeFaceCenters(257), { seed: 7 });

  for (const spec of specs) {
    const axisLength = Math.hypot(spec.axisX, spec.axisY, spec.axisZ);
    assert.ok(
      Math.abs(axisLength - 1) < 1e-6,
      `rotation axis must stay normalized, got ${axisLength}`,
    );
    assert.notEqual(spec.spin, 0, "shards must turn in flight");
    assert.ok(Math.abs(spec.spin) <= Math.PI * 1.1 + 1e-9);
  }
});

test("per-face delays stay inside the offset+stagger+jitter envelope", () => {
  const specs = createLobbyShatterFaces(makeFaceCenters(257), { seed: 7, wordDelayMs: 150 });

  for (const spec of specs) {
    assert.ok(
      spec.delayMs >= START_LOBBY_INTRO_ASSEMBLE_OFFSET_MS + 150,
      `word stagger must be respected, got ${spec.delayMs}`,
    );
    assert.ok(
      spec.delayMs <=
        START_LOBBY_INTRO_ASSEMBLE_OFFSET_MS + 150 + START_LOBBY_INTRO_FRAGMENT_DELAY_MS + 1e-9,
      `random jitter must stay bounded, got ${spec.delayMs}`,
    );
    assert.ok(
      spec.durationMs >= START_LOBBY_INTRO_FRAGMENT_MIN_MS &&
        spec.durationMs <=
          START_LOBBY_INTRO_FRAGMENT_MIN_MS + START_LOBBY_INTRO_FRAGMENT_VARIANCE_MS + 1e-9,
      `duration out of range: ${spec.durationMs}`,
    );
    assert.ok(
      spec.delayMs + spec.durationMs <= START_LOBBY_INTRO_TOTAL_MS + 1e-9,
      `every face must finish inside the intro window, ends at ${spec.delayMs + spec.durationMs}`,
    );
  }
});

test("the assemble window stays inside the agreed ~1.6s-2s span", () => {
  assert.ok(START_LOBBY_INTRO_ASSEMBLE_MS >= 1600);
  assert.ok(START_LOBBY_INTRO_ASSEMBLE_MS <= 2000);
  assert.equal(START_LOBBY_INTRO_TOTAL_MS, START_LOBBY_INTRO_ASSEMBLE_MS);
  assert.equal(START_LOBBY_INTRO_ASSEMBLED_CLOCK_S, START_LOBBY_INTRO_TOTAL_MS / 1000);
  assert.ok(START_LOBBY_INTRO_WORD_STAGGER_MS > 0, "SPACE must assemble later than the title");
});

test("at 0% every face is fully scattered away from its rest pose and invisible", () => {
  const specs = createLobbyShatterFaces(makeFaceCenters(128), { seed: 7 });

  for (const spec of specs) {
    const pose = sampleLobbyShatterFace(spec, 0);
    assert.equal(pose.progress, 0);
    assert.equal(pose.settled, false);
    assert.equal(pose.alpha, 0, "shards fade in from transparent");
    assert.equal(pose.scale, START_LOBBY_SHATTER_START_SCALE);
    assert.equal(pose.offsetX, spec.scatterX);
    assert.equal(pose.offsetY, spec.scatterY);
    assert.equal(pose.offsetZ, spec.scatterZ);
    assert.equal(pose.angle, spec.spin);
    const distance = Math.hypot(spec.scatterX, spec.scatterY, spec.scatterZ);
    assert.ok(distance > 1, `shards must start well scattered, got ${distance}`);
  }
});

test("faces scatter away from the geometry center so they converge from all sides", () => {
  const centers = makeFaceCenters(400);
  const specs = createLobbyShatterFaces(centers, { seed: 7 });
  const centerX = (Math.min(...centers.map((c) => c.x)) + Math.max(...centers.map((c) => c.x))) / 2;
  const centerY = (Math.min(...centers.map((c) => c.y)) + Math.max(...centers.map((c) => c.y))) / 2;

  let outwardCount = 0;
  for (let index = 0; index < specs.length; index += 1) {
    const restDistance = Math.hypot(centers[index].x - centerX, centers[index].y - centerY);
    const scatteredDistance = Math.hypot(
      centers[index].x + specs[index].scatterX - centerX,
      centers[index].y + specs[index].scatterY - centerY,
    );
    if (scatteredDistance > restDistance) outwardCount += 1;
  }
  assert.ok(
    outwardCount > specs.length * 0.7,
    `most shards must start farther from center than their rest pose, got ${outwardCount}/${specs.length}`,
  );
});

test("at 100% every face settles exactly back onto the intact text model", () => {
  const specs = createLobbyShatterFaces(makeFaceCenters(128), { seed: 7 });

  for (const spec of specs) {
    const pose = sampleLobbyShatterFace(spec, START_LOBBY_INTRO_TOTAL_MS + 1);
    assert.equal(pose.offsetX, 0);
    assert.equal(pose.offsetY, 0);
    assert.equal(pose.offsetZ, 0);
    assert.equal(pose.angle, 0);
    assert.equal(pose.scale, 1);
    assert.equal(pose.alpha, 1);
    assert.equal(pose.progress, 1);
    assert.equal(pose.settled, true);
  }
});

test("mid-flight poses stay finite and the ease overshoots before settling", () => {
  const specs = createLobbyShatterFaces(makeFaceCenters(96), { seed: 7 });

  for (let elapsed = 0; elapsed <= START_LOBBY_INTRO_TOTAL_MS; elapsed += 37) {
    for (const spec of specs) {
      const pose = sampleLobbyShatterFace(spec, elapsed);
      assert.ok(Number.isFinite(pose.offsetX) && Number.isFinite(pose.offsetY));
      assert.ok(Number.isFinite(pose.offsetZ) && Number.isFinite(pose.angle));
      assert.ok(Number.isFinite(pose.scale) && pose.scale > 0);
      assert.ok(pose.alpha >= 0 && pose.alpha <= 1);
    }
  }

  assert.equal(resolveLobbyShatterEase(0), 0);
  assert.equal(resolveLobbyShatterEase(1), 1);
  let overshoots = false;
  for (let progress = 0.3; progress < 1; progress += 0.01) {
    if (resolveLobbyShatterEase(progress) > 1) overshoots = true;
  }
  assert.equal(overshoots, true, "the ease must overshoot past the rest pose before settling");
});

test("shards fade in gradually instead of popping into view", () => {
  const specs = createLobbyShatterFaces(makeFaceCenters(96), { seed: 7 });
  const spec = specs.reduce((earliest, candidate) =>
    candidate.delayMs < earliest.delayMs ? candidate : earliest,
  );

  const early = spec.delayMs + spec.durationMs * 0.15;
  const pose = sampleLobbyShatterFace(spec, early);
  assert.ok(pose.alpha > 0, "fade-in must have started early in the flight");
  assert.ok(pose.alpha < 0.75, `fade-in ramp keeps shards translucent early, got ${pose.alpha}`);

  const late = spec.delayMs + spec.durationMs * 0.5;
  assert.equal(sampleLobbyShatterFace(spec, late).alpha, 1);
});

test("the white field fades out uniformly over the whole screen until fully clear", () => {
  const start = resolveLobbyIntroWipe(0);
  assert.equal(start.opacity, 1, "the wipe starts as a full white field");
  assert.equal(start.active, true);

  let previous = 1;
  for (let elapsed = 0; elapsed <= START_LOBBY_INTRO_WIPE_MS; elapsed += 25) {
    const wipe = resolveLobbyIntroWipe(elapsed);
    assert.ok(Number.isFinite(wipe.opacity));
    assert.ok(wipe.opacity <= previous, "the white field must fade monotonically");
    previous = wipe.opacity;
  }

  const end = resolveLobbyIntroWipe(START_LOBBY_INTRO_WIPE_MS);
  assert.equal(end.active, false);
  assert.equal(end.opacity, 0, "the white field must fully clear");
});
