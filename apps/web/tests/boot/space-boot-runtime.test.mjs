import assert from "node:assert/strict";
import test from "node:test";
import { readSourceFile } from "../helpers/projectPaths.mjs";

import { watchRendererDeviceLoss } from "../../src/boot/rendererDeviceLoss.ts";
import {
  disposeOwnedBootRenderer,
  replaceOwnedBootRenderer,
  replaceWatchedBootRenderer,
} from "../../src/boot/ownedBootRenderer.ts";
import {
  createRendererGeneration,
  resolveRendererGeneration,
  runForActiveRendererGeneration,
} from "../../src/boot/rendererGeneration.ts";
import { BootAttemptErrorBoundary } from "../../src/boot/BootAttemptErrorBoundary.ts";
import { createBootReportingGate } from "../../src/boot/bootReportingGate.ts";
import { createElement } from "react";
import { act, create } from "react-test-renderer";

class FakeCanvas extends EventTarget {}

test("superseded boot renderers are disposed exactly once by their owner", () => {
  const ref = { current: null };
  let firstDisposals = 0;
  let secondDisposals = 0;
  const first = { dispose: () => { firstDisposals += 1; } };
  const second = { dispose: () => { secondDisposals += 1; } };

  replaceOwnedBootRenderer(ref, first);
  replaceOwnedBootRenderer(ref, second);
  assert.equal(firstDisposals, 1);
  assert.equal(secondDisposals, 0);
  assert.equal(disposeOwnedBootRenderer(ref), true);
  assert.equal(disposeOwnedBootRenderer(ref), false);
  assert.equal(secondDisposals, 1);
});

test("renderer replacement cancels the prior loss watcher before disposal", () => {
  let watcherActive = true;
  let falseRecoveries = 0;
  const rendererRef = {
    current: {
      dispose() {
        if (watcherActive) falseRecoveries += 1;
      },
    },
  };
  const watcherRef = {
    current: () => { watcherActive = false; },
  };
  const replacement = { dispose() {} };

  replaceWatchedBootRenderer(rendererRef, watcherRef, replacement);
  assert.equal(falseRecoveries, 0);
  assert.equal(watcherRef.current, null);
  assert.equal(rendererRef.current, replacement);
});

test("full to simplified to full ignores the oldest generation rejection", () => {
  let active = createRendererGeneration(7, "full");
  const oldestFull = active;
  active = resolveRendererGeneration(active, 7, "simplified");
  const simplified = active;
  active = resolveRendererGeneration(active, 7, "full");
  const latestFull = active;
  const reports = [];

  assert.equal(oldestFull.nonce, 0);
  assert.equal(simplified.nonce, 1);
  assert.equal(latestFull.nonce, 2);
  assert.equal(
    runForActiveRendererGeneration(active, oldestFull, () => reports.push("old reject")),
    false,
  );
  assert.equal(
    runForActiveRendererGeneration(active, latestFull, () => reports.push("latest resolve")),
    true,
  );
  assert.deepEqual(reports, ["latest resolve"]);
});

test("WebGL context loss is observed once and cleanup rejects stale events", () => {
  const canvas = new FakeCanvas();
  const losses = [];
  const stop = watchRendererDeviceLoss(
    { backend: { isWebGLBackend: true } },
    canvas,
    (error) => losses.push(error.message),
  );

  const first = new Event("webglcontextlost", { cancelable: true });
  canvas.dispatchEvent(first);
  canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  assert.equal(first.defaultPrevented, true);
  assert.deepEqual(losses, ["WebGL context lost"]);

  stop();
  canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  assert.deepEqual(losses, ["WebGL context lost"]);
});

test("WebGPU loss promises are ignored after an attempt cleanup", async () => {
  let resolveLost;
  const lost = new Promise((resolve) => { resolveLost = resolve; });
  const losses = [];
  const stop = watchRendererDeviceLoss(
    { backend: { isWebGPUBackend: true, device: { lost } } },
    new FakeCanvas(),
    (error) => losses.push(error.message),
  );
  stop();
  resolveLost({ message: "adapter reset" });
  await Promise.resolve();
  assert.deepEqual(losses, []);
});

test("intentional WebGPU destruction is ignored while a real loss is reported", async () => {
  let resolveDestroyed;
  let resolveReal;
  const destroyedLoss = new Promise((resolve) => { resolveDestroyed = resolve; });
  const realLoss = new Promise((resolve) => { resolveReal = resolve; });
  const losses = [];

  watchRendererDeviceLoss(
    { backend: { isWebGPUBackend: true, device: { lost: destroyedLoss } } },
    new FakeCanvas(),
    (error) => losses.push(error.message),
  );
  resolveDestroyed({ reason: "destroyed", message: "Device was intentionally destroyed" });
  await Promise.resolve();
  assert.deepEqual(losses, []);

  watchRendererDeviceLoss(
    { backend: { isWebGPUBackend: true, device: { lost: realLoss } } },
    new FakeCanvas(),
    (error) => losses.push(error.message),
  );
  resolveReal({ reason: "unknown", message: "adapter reset" });
  await Promise.resolve();
  assert.deepEqual(losses, ["adapter reset"]);
});

test("production wiring starts only from trusted Enter and uses real attempt-scoped signals", () => {
  const desktopApp = readSourceFile("app", "DesktopApp.tsx");
  const host = readSourceFile("space", "SpaceHost.tsx");
  const experience = readSourceFile("pages", "SpaceDesktopExperience.tsx");
  const canvasHost = readSourceFile("space", "SpaceCanvasHost.tsx");
  const canvasStatus = readSourceFile("space", "spaceCanvasStatus.ts");
  const hud = readSourceFile("space", "SpaceHud.tsx");
  const scene = readSourceFile("scenes", "SpaceScene.tsx");
  const gallery = readSourceFile("scenes", "gallery", "GalleryModel.tsx");
  const exhibits = readSourceFile("scenes", "exhibits", "SceneExhibitPlacement.tsx");
  const globalCss = readSourceFile("styles", "global.css");

  assert.match(desktopApp, /const boot = useSpaceBootController\(\)/);
  assert.match(desktopApp, /const onTrustedEnter[\s\S]*boot\.start\(\)[\s\S]*setSpaceStarted\(true\)/);
  assert.doesNotMatch(host, /\.start\(\)/, "mounting SpaceHost must not start Boot");
  assert.match(host, /const bootPhase = boot\.state\.phase/);
  assert.match(host, /if \(bootPhase === "running"\) startFade\(\)/);
  assert.match(canvasHost, /milestoneReady\(attemptId, "renderer"\)/);
  assert.match(canvasHost, /milestoneReady\(attemptId, "physics"\)/);
  assert.match(experience, /manifestResolved\(\s*attemptId,/);
  assert.match(gallery, /milestoneReady\(attemptId, "environment"\)|onEnvironmentReady/);
  assert.match(gallery, /milestoneReady\(attemptId, "gallery"\)|onGalleryReady/);
  assert.match(scene + exhibits, /onExhibitReady/);
  assert.match(exhibits, /onExhibitFailed/);
  assert.match(exhibits, /onExhibitDeferred/);
  assert.match(
    canvasHost,
    /key=\{`space-canvas-\$\{attemptId\}-\$\{requestedProfile\}`\}/,
    "a new attempt must synchronously replace the prior Canvas exactly once",
  );
  assert.match(
    canvasHost,
    /bootState\.phase === "failed" \? null/,
    "a failed attempt must unmount its Canvas before manual retry",
  );
  assert.match(canvasHost, /resolveSpaceCanvasStatus\(rendererRuntime/);
  assert.match(canvasStatus, /loading: profile === null && error === null && !scope\.bootFailed/);
  assert.match(hud, /role="status"[\s\S]*t\("space\.loading"\)/);
  assert.match(hud, /space-renderer-loading-indicator/);
  assert.match(globalCss, /\.space-renderer-loading-indicator[\s\S]*animation:/);
  assert.match(globalCss, /prefers-reduced-motion: reduce[\s\S]*\.space-renderer-loading-indicator/);
  assert.match(
    experience + hud,
    /totalItems=\{bootState\.phase === "booting" \? bootState\.items\.total : 0\}[\s\S]*totalItems > 0/,
    "real Boot item counts are shown only while Boot itself is active",
  );
  assert.match(
    canvasHost,
    /replaceWatchedBootRenderer\([\s\S]*ownedRendererRef,[\s\S]*rendererLossCleanupRef,[\s\S]*renderer/,
    "intentional replacement must detach the old loss watcher before disposal",
  );
  assert.match(canvasHost, /runForActiveRendererGeneration/g);
  assert.doesNotMatch(
    host + experience + canvasHost + hud + scene + gallery + exhibits,
    /setInterval|requestAnimationFrame\([^)]*(?:boot|progress)|fakeProgress/,
  );
});

test("Canvas subtree failures fail one attempt and retry remounts the subtree", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const reports = [];
  let mounts = 0;
  function Scene({ shouldThrow }) {
    mounts += 1;
    if (shouldThrow) throw new Error("physics exploded");
    return createElement("scene-ready");
  }
  const renderTree = (attemptId, shouldThrow) => createElement(
    BootAttemptErrorBoundary,
    { attemptId, onError: (id, error) => reports.push([id, error.message]) },
    createElement(Scene, { shouldThrow }),
  );
  const originalError = console.error;
  console.error = () => {};
  try {
    let renderer;
    await act(() => { renderer = create(renderTree(1, true)); });
    assert.deepEqual(reports, [[1, "physics exploded"]]);
    assert.equal(renderer.toJSON(), null);
    await act(() => { renderer.update(renderTree(2, false)); });
    assert.equal(renderer.root.findByType("scene-ready").type, "scene-ready");
    assert.ok(mounts >= 2, "a new attempt remounts the failed subtree");
    await act(() => { renderer.unmount(); });
  } finally {
    console.error = originalError;
  }
});

test("boot reporting becomes truly quiescent after running", () => {
  const scope = { attemptId: 4, phase: "booting" };
  const calls = [];
  const gate = createBootReportingGate(() => scope);
  const reportReady = gate.wrap(4, (id) => calls.push(["ready", id]));
  const reportDeferred = gate.wrap(4, (id) => calls.push(["deferred", id]));

  reportDeferred("far");
  reportReady("near");
  scope.phase = "running";
  reportDeferred("near-after-range-change");
  reportReady("late-model-resolution");
  assert.deepEqual(calls, [["deferred", "far"], ["ready", "near"]]);
  assert.equal(gate.isEnabled(4), false);
});
