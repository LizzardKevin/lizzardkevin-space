import assert from "node:assert/strict";
import { createElement, useEffect } from "react";
import { act, create } from "react-test-renderer";
import test from "node:test";
import { readSourceFile } from "../helpers/projectPaths.mjs";

import {
  INITIAL_SPACE_BOOT_STATE,
  spaceBootReducer,
} from "../../src/boot/spaceBootReducer.ts";
import { useSpaceBootController } from "../../src/boot/useSpaceBootController.ts";

const MILESTONES = ["renderer", "environment", "gallery", "physics"];

function start(state = INITIAL_SPACE_BOOT_STATE) {
  return spaceBootReducer(state, { type: "start" });
}

function completeAttempt(state) {
  let next = spaceBootReducer(state, {
    type: "manifest-resolved",
    attemptId: state.attemptId,
    exhibitIds: ["first", "second"],
  });
  for (const milestone of MILESTONES) {
    next = spaceBootReducer(next, {
      type: "milestone-ready",
      attemptId: state.attemptId,
      milestone,
    });
  }
  next = spaceBootReducer(next, {
    type: "exhibit-ready",
    attemptId: state.attemptId,
    exhibitId: "first",
  });
  return spaceBootReducer(next, {
    type: "exhibit-ready",
    attemptId: state.attemptId,
    exhibitId: "second",
  });
}

test("idle starts only after an explicit action and completes from real milestones/items", () => {
  assert.deepEqual(INITIAL_SPACE_BOOT_STATE, {
    phase: "idle",
    attemptId: 0,
    forceWebGL: false,
    deviceLossRecoveryUsed: false,
    milestones: {
      renderer: false,
      environment: false,
      gallery: false,
      physics: false,
      exhibits: false,
    },
    items: { loaded: 0, total: 0, failed: 0, deferred: 0, settledIds: [] },
    error: null,
  });

  const booting = start();
  assert.equal(booting.phase, "booting");
  assert.equal(booting.attemptId, 1);

  const running = completeAttempt(booting);
  assert.equal(running.phase, "running");
  assert.deepEqual(running.milestones, {
    renderer: true,
    environment: true,
    gallery: true,
    physics: true,
    exhibits: true,
  });
  assert.deepEqual(running.items, {
    loaded: 2,
    total: 2,
    failed: 0,
    deferred: 0,
    settledIds: ["first", "second"],
  });
});

test("manifest and exhibit events are truthful, deduplicated, and include failures", () => {
  const booting = start();
  const manifest = spaceBootReducer(booting, {
    type: "manifest-resolved",
    attemptId: 1,
    exhibitIds: ["first", "second", "second"],
  });
  assert.deepEqual(manifest.items, {
    loaded: 0,
    total: 2,
    failed: 0,
    deferred: 0,
    settledIds: [],
  });

  const loaded = spaceBootReducer(manifest, {
    type: "exhibit-ready",
    attemptId: 1,
    exhibitId: "first",
  });
  assert.equal(loaded.items.loaded, 1);
  assert.equal(spaceBootReducer(loaded, {
    type: "exhibit-ready",
    attemptId: 1,
    exhibitId: "first",
  }), loaded);

  const failed = spaceBootReducer(loaded, {
    type: "exhibit-failed",
    attemptId: 1,
    exhibitId: "second",
  });
  assert.deepEqual(failed.items, {
    loaded: 1,
    total: 2,
    failed: 1,
    deferred: 0,
    settledIds: ["first", "second"],
  });
  assert.equal(failed.milestones.exhibits, true);
});

test("out-of-range exhibits settle as deferred without pretending to be loaded", () => {
  const booting = start();
  const manifest = spaceBootReducer(booting, {
    type: "manifest-resolved",
    attemptId: 1,
    exhibitIds: ["near", "far"],
  });
  const loaded = spaceBootReducer(manifest, {
    type: "exhibit-ready",
    attemptId: 1,
    exhibitId: "near",
  });
  const settled = spaceBootReducer(loaded, {
    type: "exhibit-deferred",
    attemptId: 1,
    exhibitId: "far",
  });
  assert.deepEqual(settled.items, {
    loaded: 1,
    total: 2,
    failed: 0,
    deferred: 1,
    settledIds: ["near", "far"],
  });
  assert.equal(settled.milestones.exhibits, true);
});

test("stale async completions and running progress are strict identity no-ops", () => {
  const booting = start();
  for (const action of [
    { type: "milestone-ready", attemptId: 0, milestone: "renderer" },
    { type: "manifest-resolved", attemptId: 0, exhibitIds: [] },
    { type: "exhibit-ready", attemptId: 0, exhibitId: "late" },
    { type: "failed", attemptId: 0, error: "late failure" },
    { type: "device-lost", attemptId: 0, error: "late loss" },
  ]) {
    assert.equal(spaceBootReducer(booting, action), booting);
  }

  const running = completeAttempt(booting);
  for (const action of [
    { type: "milestone-ready", attemptId: 1, milestone: "renderer" },
    { type: "manifest-resolved", attemptId: 1, exhibitIds: ["late"] },
    { type: "exhibit-ready", attemptId: 1, exhibitId: "late" },
    { type: "exhibit-failed", attemptId: 1, exhibitId: "late" },
  ]) {
    assert.equal(spaceBootReducer(running, action), running);
  }
});

test("failure supports monotonic manual retry without resetting recovery history", () => {
  const booting = start();
  const failed = spaceBootReducer(booting, {
    type: "failed",
    attemptId: 1,
    error: "manifest unavailable",
  });
  assert.equal(failed.phase, "failed");
  assert.equal(failed.error, "manifest unavailable");

  const retrying = spaceBootReducer(failed, { type: "retry" });
  assert.equal(retrying.phase, "booting");
  assert.equal(retrying.attemptId, 2);
  assert.equal(retrying.error, null);
  assert.equal(retrying.deviceLossRecoveryUsed, false);
  assert.equal(spaceBootReducer(retrying, { type: "retry" }), retrying);
});

test("device loss performs at most one forced-WebGL recovery", () => {
  const running = completeAttempt(start());
  const recovering = spaceBootReducer(running, {
    type: "device-lost",
    attemptId: 1,
    error: "GPU reset",
  });
  assert.equal(recovering.phase, "booting");
  assert.equal(recovering.attemptId, 2);
  assert.equal(recovering.forceWebGL, true);
  assert.equal(recovering.deviceLossRecoveryUsed, true);

  const runningAgain = completeAttempt(recovering);
  const stopped = spaceBootReducer(runningAgain, {
    type: "device-lost",
    attemptId: 2,
    error: "WebGL context lost",
  });
  assert.equal(stopped.phase, "failed");
  assert.equal(stopped.attemptId, 2);
  assert.equal(stopped.forceWebGL, true);
  assert.equal(stopped.error, "WebGL context lost");
});

test("controller mount remains idle until explicit start and schedules no recurring work", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const originalConsoleError = console.error;
  console.error = (message, ...rest) => {
    if (String(message).includes("react-test-renderer is deprecated")) return;
    originalConsoleError(message, ...rest);
  };
  const snapshots = [];
  let controller;

  function Probe() {
    controller = useSpaceBootController();
    useEffect(() => {
      snapshots.push(controller.state);
    }, [controller.state]);
    return null;
  }

  try {
    let renderer;
    await act(() => { renderer = create(createElement(Probe)); });
    assert.equal(controller.state, INITIAL_SPACE_BOOT_STATE);
    assert.deepEqual(snapshots.map((state) => state.phase), ["idle"]);

    await act(() => { controller.start(); });
    assert.equal(controller.state.phase, "booting");
    assert.equal(controller.state.attemptId, 1);
    await act(() => { renderer.unmount(); });
  } finally {
    console.error = originalConsoleError;
  }

  const controllerSource = readSourceFile("boot", "useSpaceBootController.ts");
  assert.doesNotMatch(controllerSource, /setInterval|requestAnimationFrame|setTimeout/);
});
