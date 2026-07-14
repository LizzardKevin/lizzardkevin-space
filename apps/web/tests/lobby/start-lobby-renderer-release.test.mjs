import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const releaseUrl = new URL("../../src/lobby/startLobbyRendererRelease.ts", import.meta.url);

async function loadRelease() {
  assert.equal(existsSync(releaseUrl), true, "the route renderer release helper must exist");
  return import(releaseUrl.href);
}

test("route cleanup loses the WebGL context synchronously and only once", async () => {
  const { releaseStartLobbyRouteRenderer } = await loadRelease();
  let contextLosses = 0;
  let disposals = 0;
  const renderer = {
    forceContextLoss() {
      contextLosses += 1;
    },
    dispose() {
      disposals += 1;
    },
  };

  releaseStartLobbyRouteRenderer(renderer);
  assert.equal(contextLosses, 1);
  assert.equal(disposals, 1);

  renderer.forceContextLoss();
  assert.equal(contextLosses, 1, "R3F's delayed cleanup must not lose the same context twice");
});
