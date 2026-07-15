import assert from "node:assert/strict";
import test from "node:test";
import {
  START_LOBBY_STREAM_COUNT,
  advanceLobbyGlyph,
  createLobbyFragmentBurst,
  repeatLobbyEntries,
  resolveLobbyAttractionSpeed,
  segmentLobbyGraphemes,
} from "../../src/lobby/startLobbyGlyphPhysics.ts";

test("repeats a small independent pool to exactly 50 streams", () => {
  const pool = [
    { exhibitId: "a", kind: "title", text: "TITLE" },
    { exhibitId: "a", kind: "subtitle", text: "SUBTITLE" },
  ];

  const streams = repeatLobbyEntries(pool);

  assert.equal(streams.length, START_LOBBY_STREAM_COUNT);
  assert.equal(START_LOBBY_STREAM_COUNT, 50);
  assert.deepEqual(
    streams.slice(0, 4).map((item) => item.kind),
    ["title", "subtitle", "title", "subtitle"],
  );
});

test("attraction accelerates non-linearly toward the pointer core", () => {
  const outer = resolveLobbyAttractionSpeed(0.1);
  const middle = resolveLobbyAttractionSpeed(0.5);
  const inner = resolveLobbyAttractionSpeed(0.9);

  assert.ok(outer >= 25);
  assert.ok(outer < middle && middle < inner);
  assert.ok(inner - middle > middle - outer);
  assert.ok(resolveLobbyAttractionSpeed(0) <= 30);
  assert.ok(resolveLobbyAttractionSpeed(1) >= 595);
});

test("an empty content pool remains empty instead of inventing lobby copy", () => {
  assert.deepEqual(repeatLobbyEntries([]), []);
});

test("segments emoji and CJK by grapheme cluster", () => {
  assert.deepEqual(segmentLobbyGraphemes("A👨‍👩‍👧‍👦中", "zh"), ["A", "👨‍👩‍👧‍👦", "中"]);
});

test("attraction is radial and adds rotation without a spiral force", () => {
  const glyph = {
    x: 0,
    y: 0,
    vx: -20,
    vy: 0,
    rotation: 0,
    angularVelocity: 0,
    detached: false,
    alive: true,
  };

  const result = advanceLobbyGlyph(
    glyph,
    { x: 100, y: 0, active: true },
    1 / 30,
    180,
    20,
    0.8,
  );

  assert.equal(result, "alive");
  assert.ok(glyph.vx > -20);
  assert.equal(glyph.vy, 0);
  assert.notEqual(glyph.angularVelocity, 0);
  assert.equal(glyph.detached, true);
});

test("detached glyphs keep displacement and rotation after force leaves", () => {
  const glyph = {
    x: 25,
    y: 17,
    vx: 42,
    vy: 8,
    rotation: 0.4,
    angularVelocity: 1.2,
    detached: true,
    alive: true,
  };

  const result = advanceLobbyGlyph(
    glyph,
    { x: 0, y: 0, active: false },
    1 / 30,
    180,
    20,
    0.3,
  );

  assert.equal(result, "alive");
  assert.notEqual(glyph.y, 0);
  assert.ok(glyph.rotation > 0.4);
  assert.equal(glyph.detached, true);
});

test("a glyph is consumed only inside the active pointer core", () => {
  const activeGlyph = {
    x: 4,
    y: 3,
    vx: -20,
    vy: 0,
    rotation: 0,
    angularVelocity: 0,
    detached: false,
    alive: true,
  };
  const inactiveGlyph = { ...activeGlyph };

  assert.equal(
    advanceLobbyGlyph(activeGlyph, { x: 0, y: 0, active: true }, 1 / 30, 180, 20, 0.2),
    "consumed",
  );
  assert.equal(activeGlyph.alive, false);
  assert.equal(
    advanceLobbyGlyph(inactiveGlyph, { x: 0, y: 0, active: false }, 1 / 30, 180, 20, 0.2),
    "alive",
  );
  assert.equal(inactiveGlyph.alive, true);
});

test("core grinding emits only two or three short white fragments", () => {
  const burst = createLobbyFragmentBurst(20, 30, 0.4, 1000);

  assert.ok(burst.length === 2 || burst.length === 3);
  assert.ok(
    burst.every(
      (fragment) =>
        fragment.lifeMs === 360 &&
        fragment.length >= 1.5 &&
        fragment.length <= 4 &&
        fragment.x === 20 &&
        fragment.y === 30,
    ),
  );
});
