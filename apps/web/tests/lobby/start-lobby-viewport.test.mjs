import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const viewportUrl = new URL("../../src/lobby/startLobbyViewport.ts", import.meta.url);

async function loadViewport() {
  assert.equal(existsSync(viewportUrl), true, "the lobby viewport synchronizer must exist");
  return import(viewportUrl.href);
}

test("a changed container size flows through R3F setSize and invalidates demand rendering", async () => {
  const { syncStartLobbyViewport } = await loadViewport();
  const calls = [];
  const state = {
    size: { width: 1440, height: 900 },
    setSize: (...args) => calls.push(["setSize", ...args]),
    invalidate: () => calls.push(["invalidate"]),
  };

  assert.equal(syncStartLobbyViewport({ getState: () => state }, 1000, 700), true);
  assert.deepEqual(calls, [
    ["setSize", 1000, 700, 0, 0],
    ["invalidate"],
  ]);
});

test("unchanged and non-positive measurements perform no renderer work", async () => {
  const { syncStartLobbyViewport } = await loadViewport();
  let calls = 0;
  const state = {
    size: { width: 1000, height: 700 },
    setSize: () => {
      calls += 1;
    },
    invalidate: () => {
      calls += 1;
    },
  };
  const store = { getState: () => state };

  assert.equal(syncStartLobbyViewport(store, 1000, 700), false);
  assert.equal(syncStartLobbyViewport(store, 0, 700), false);
  assert.equal(syncStartLobbyViewport(store, Number.NaN, 700), false);
  assert.equal(calls, 0);
});
