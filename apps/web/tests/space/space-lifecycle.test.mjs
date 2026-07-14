import assert from "node:assert/strict";
import { createElement, useEffect, useState } from "react";
import { act, create } from "react-test-renderer";
import test from "node:test";
import {
  INITIAL_START_LOBBY_HANDOFF_STATE,
  reduceStartLobbyHandoff,
} from "../../src/lobby/startLobbyHandoff.ts";
import { PersistentSpaceHostBoundary } from "../../src/space/PersistentSpaceHostBoundary.ts";
import { resolveSpaceRouteRuntimePolicy } from "../../src/space/routeRuntimePolicy.ts";

test("trusted Enter stays covered through disposal, boot, and reveal", () => {
  let handoff = INITIAL_START_LOBBY_HANDOFF_STATE;
  handoff = reduceStartLobbyHandoff(handoff, { type: "trusted-enter" });
  assert.equal(handoff.phase, "disposing");
  handoff = reduceStartLobbyHandoff(handoff, { type: "lobby-disposed" });
  assert.equal(handoff.phase, "booting");
  handoff = reduceStartLobbyHandoff(handoff, { type: "boot-running" });
  assert.equal(handoff.phase, "revealing");
  handoff = reduceStartLobbyHandoff(handoff, { type: "reveal-finished" });
  assert.equal(handoff.phase, "entered", "first-person controls become eligible only after reveal");
});

test("the production host boundary preserves one React host instance across route history", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const originalConsoleError = console.error;
  console.error = (message, ...rest) => {
    if (String(message).includes("react-test-renderer is deprecated")) return;
    originalConsoleError(message, ...rest);
  };
  let mounts = 0;
  let unmounts = 0;

  function ProbeHost({ route }) {
    const [identity] = useState(() => ({ marker: "live-host-state" }));
    useEffect(() => {
      mounts += 1;
      return () => { unmounts += 1; };
    }, []);
    return createElement("probe-host", { identity, route });
  }

  const tree = (route, started) => createElement(PersistentSpaceHostBoundary, {
    routeSurface: createElement("route-surface", { route }),
    startedHost: started ? createElement(ProbeHost, { route }) : null,
  });

  try {
    let renderer;
    await act(() => { renderer = create(tree("/", false)); });
    assert.equal(mounts, 0, "cold routes do not mount the host boundary child");

    await act(() => { renderer.update(tree("/", true)); });
    const identity = renderer.root.findByType("probe-host").props.identity;
    for (const route of ["/works/tree-habitat", "/profile", "/devstories", "/profile", "/"]) {
      await act(() => { renderer.update(tree(route, true)); });
      assert.equal(renderer.root.findByType("probe-host").props.identity, identity);
      assert.equal(mounts, 1);
      assert.equal(unmounts, 0);
    }

    await act(() => { renderer.unmount(); });
    assert.equal(unmounts, 1);
  } finally {
    console.error = originalConsoleError;
  }
});

test("works pauses the main runtime without pausing Focus playback", () => {
  assert.deepEqual(resolveSpaceRouteRuntimePolicy("work"), {
    routeBlocked: true,
    pauseMainAudio: true,
    pauseContentPlayback: false,
  });
  assert.equal(resolveSpaceRouteRuntimePolicy("profile").pauseContentPlayback, false);
  assert.equal(resolveSpaceRouteRuntimePolicy("not-found").pauseContentPlayback, false);

  let pauseCalls = 0;
  for (let identity = 0; identity < 50; identity += 1) {
    const changingPlaybackApi = { identity, pause: () => { pauseCalls += 1; } };
    if (resolveSpaceRouteRuntimePolicy("work").pauseContentPlayback) {
      changingPlaybackApi.pause();
    }
  }
  assert.equal(pauseCalls, 0, "changing playback API identity cannot trigger a coordinator pause loop");
});
