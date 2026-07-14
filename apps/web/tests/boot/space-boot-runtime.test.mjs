import assert from "node:assert/strict";
import test from "node:test";
import { readSourceFile } from "../helpers/projectPaths.mjs";

import { watchRendererDeviceLoss } from "../../src/boot/rendererDeviceLoss.ts";
import {
  disposeOwnedBootRenderer,
  replaceOwnedBootRenderer,
} from "../../src/boot/ownedBootRenderer.ts";

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

test("production wiring starts only from trusted Enter and uses real attempt-scoped signals", () => {
  const desktopApp = readSourceFile("app", "DesktopApp.tsx");
  const host = readSourceFile("space", "SpaceHost.tsx");
  const experience = readSourceFile("pages", "SpaceDesktopExperience.tsx");
  const scene = readSourceFile("scenes", "SpaceScene.tsx");
  const gallery = readSourceFile("scenes", "gallery", "GalleryModel.tsx");
  const exhibits = readSourceFile("scenes", "exhibits", "SceneExhibitPlacement.tsx");

  assert.match(desktopApp, /const boot = useSpaceBootController\(\)/);
  assert.match(desktopApp, /const onTrustedEnter[\s\S]*boot\.start\(\)[\s\S]*setSpaceStarted\(true\)/);
  assert.doesNotMatch(host, /\.start\(\)/, "mounting SpaceHost must not start Boot");
  assert.match(host, /const bootPhase = boot\.state\.phase/);
  assert.match(host, /if \(bootPhase === "running"\) startFade\(\)/);
  assert.match(experience, /milestoneReady\(attemptId, "renderer"\)/);
  assert.match(experience, /milestoneReady\(attemptId, "physics"\)/);
  assert.match(experience, /manifestResolved\(\s*attemptId,/);
  assert.match(gallery, /milestoneReady\(attemptId, "environment"\)|onEnvironmentReady/);
  assert.match(gallery, /milestoneReady\(attemptId, "gallery"\)|onGalleryReady/);
  assert.match(scene + exhibits, /onExhibitReady/);
  assert.match(exhibits, /onExhibitFailed/);
  assert.match(exhibits, /onExhibitDeferred/);
  assert.match(
    experience,
    /key=\{`space-canvas-\$\{attemptId\}-\$\{requestedProfile\}`\}/,
    "a new attempt must synchronously replace the prior Canvas exactly once",
  );
  assert.match(
    experience,
    /bootState\.phase === "failed" \? null/,
    "a failed attempt must unmount its Canvas before manual retry",
  );
  assert.match(
    experience,
    /bootState\.phase === "booting" \? \([\s\S]*role="status"[\s\S]*items\.loaded \+ bootState\.items\.failed/,
    "the loading surface must remain until every real boot milestone settles",
  );
  assert.doesNotMatch(
    host + experience + scene + gallery + exhibits,
    /setInterval|requestAnimationFrame\([^)]*(?:boot|progress)|fakeProgress/,
  );
});
