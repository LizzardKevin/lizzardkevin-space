import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const handoffUrl = new URL("../../src/lobby/startLobbyHandoff.ts", import.meta.url);

async function loadHandoff() {
  assert.equal(existsSync(handoffUrl), true, "the StartLobby handoff reducer must exist");
  return import(handoffUrl.href);
}

test("the handoff waits for lobby disposal before booting", async () => {
  const { INITIAL_START_LOBBY_HANDOFF_STATE, reduceStartLobbyHandoff } = await loadHandoff();
  const disposing = reduceStartLobbyHandoff(INITIAL_START_LOBBY_HANDOFF_STATE, {
    type: "trusted-enter",
  });

  assert.equal(disposing.phase, "disposing");
  assert.equal(
    reduceStartLobbyHandoff(INITIAL_START_LOBBY_HANDOFF_STATE, { type: "lobby-disposed" }).phase,
    "lobby",
  );
  assert.equal(reduceStartLobbyHandoff(disposing, { type: "lobby-disposed" }).phase, "booting");
});

test("the handoff reveals only after boot is running", async () => {
  const { INITIAL_START_LOBBY_HANDOFF_STATE, reduceStartLobbyHandoff } = await loadHandoff();
  const disposing = reduceStartLobbyHandoff(INITIAL_START_LOBBY_HANDOFF_STATE, {
    type: "trusted-enter",
  });
  const booting = reduceStartLobbyHandoff(disposing, { type: "lobby-disposed" });

  assert.equal(reduceStartLobbyHandoff(disposing, { type: "boot-running" }).phase, "disposing");
  const revealing = reduceStartLobbyHandoff(booting, { type: "boot-running" });
  assert.equal(revealing.phase, "revealing");
  assert.equal(reduceStartLobbyHandoff(revealing, { type: "reveal-finished" }).phase, "entered");
});

test("a failed boot stays covered and can retry", async () => {
  const { INITIAL_START_LOBBY_HANDOFF_STATE, reduceStartLobbyHandoff } = await loadHandoff();
  const disposing = reduceStartLobbyHandoff(INITIAL_START_LOBBY_HANDOFF_STATE, {
    type: "trusted-enter",
  });
  const booting = reduceStartLobbyHandoff(disposing, { type: "lobby-disposed" });
  const failed = reduceStartLobbyHandoff(booting, { type: "boot-failed" });

  assert.equal(failed.phase, "failed");
  assert.equal(reduceStartLobbyHandoff(failed, { type: "retry" }).phase, "booting");
  assert.equal(reduceStartLobbyHandoff(booting, { type: "retry" }).phase, "booting");
});

test("a device loss during reveal restores the failure cover", async () => {
  const { INITIAL_START_LOBBY_HANDOFF_STATE, reduceStartLobbyHandoff } = await loadHandoff();
  const disposing = reduceStartLobbyHandoff(INITIAL_START_LOBBY_HANDOFF_STATE, {
    type: "trusted-enter",
  });
  const booting = reduceStartLobbyHandoff(disposing, { type: "lobby-disposed" });
  const revealing = reduceStartLobbyHandoff(booting, { type: "boot-running" });

  assert.equal(reduceStartLobbyHandoff(revealing, { type: "boot-failed" }).phase, "failed");
});

test("trusted Enter is idempotent after disposal starts", async () => {
  const { INITIAL_START_LOBBY_HANDOFF_STATE, reduceStartLobbyHandoff } = await loadHandoff();
  const disposing = reduceStartLobbyHandoff(INITIAL_START_LOBBY_HANDOFF_STATE, {
    type: "trusted-enter",
  });

  assert.strictEqual(
    reduceStartLobbyHandoff(disposing, { type: "trusted-enter" }),
    disposing,
  );
});

test("pointer tilt is clamped to six degrees", async () => {
  const { resolveStartLobbyTilt } = await loadHandoff();
  const maxRadians = (6 * Math.PI) / 180;

  assert.deepEqual(resolveStartLobbyTilt(50, 50, 100, 100), { x: 0, y: 0 });
  const edge = resolveStartLobbyTilt(1000, -1000, 100, 100);
  assert.equal(edge.x, maxRadians);
  assert.equal(edge.y, maxRadians);
});
