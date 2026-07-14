import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

test("renderer profiles expose immutable full and simplified capabilities", async () => {
  const { RENDERER_PROFILES } = await importSourceModule("rendering/rendererProfile.ts");
  assert.deepEqual(RENDERER_PROFILES.full, { id: "full", maxDpr: 2, postProcessing: true, shadows: true, expensiveLeaves: { galleryAtmosphere: true }, physics: true, interaction: true, spaceScene: true, focus: true });
  assert.deepEqual(RENDERER_PROFILES.simplified, { id: "simplified", maxDpr: 1, postProcessing: false, shadows: false, expensiveLeaves: { galleryAtmosphere: false }, physics: true, interaction: true, spaceScene: true, focus: true });
  assert.equal(Object.isFrozen(RENDERER_PROFILES.full), true);
  assert.equal(Object.isFrozen(RENDERER_PROFILES.full.expensiveLeaves), true);
});

test("actual renderer backend truthfully resolves its profile", async () => {
  const { resolveRendererBackend } = await importSourceModule("rendering/rendererProfile.ts");
  assert.deepEqual(resolveRendererBackend({ isWebGPUBackend: true }), { backend: "webgpu", profile: "full" });
  assert.deepEqual(resolveRendererBackend({ isWebGLBackend: true }), { backend: "webgl2", profile: "simplified" });
  assert.throws(() => resolveRendererBackend({}), /Unknown renderer backend/);
});

test("renderer DPR comes only from the resolved profile configuration", async () => {
  const { RENDERER_PROFILES, resolveRendererDpr } = await importSourceModule(
    "rendering/rendererProfile.ts",
  );

  assert.equal(resolveRendererDpr(null), 1);
  assert.equal(resolveRendererDpr(RENDERER_PROFILES.simplified), 1);
  assert.deepEqual(resolveRendererDpr(RENDERER_PROFILES.full), [1, 2]);
});

test("profile switching preserves the latest pose and resets renderer resolution", async () => {
  const { switchRendererProfileState } = await importSourceModule("rendering/rendererProfile.ts");
  const latestPose = { position: [7, 8, 9], yaw: 1.25 };

  for (const [from, to] of [["full", "simplified"], ["simplified", "full"]]) {
    const next = switchRendererProfileState(
      {
        requestedProfile: from,
        initialPose: { position: [0, 0, 0] },
        nonce: 4,
        resolvedProfile: { id: from },
        error: new Error("old failure"),
      },
      to,
      latestPose,
    );
    assert.equal(next.requestedProfile, to);
    assert.equal(next.initialPose, latestPose);
    assert.equal(next.nonce, 5);
    assert.equal(next.resolvedProfile, null);
    assert.equal(next.error, null);
  }
});

test("Focus never requests a profile above the main resolved profile", async () => {
  const { resolveFocusRequestedProfile } = await importSourceModule("rendering/rendererProfile.ts");
  assert.equal(resolveFocusRequestedProfile("simplified"), "simplified");
  assert.equal(resolveFocusRequestedProfile("full"), "full");
});

test("detached canvases dispose late renderers while connected canvases keep them", async () => {
  const { disposeRendererIfCanvasDetached } = await importSourceModule(
    "rendering/rendererLifecycle.ts",
  );
  let disposals = 0;
  const renderer = { dispose: () => { disposals += 1; } };

  assert.equal(disposeRendererIfCanvasDetached(renderer, { isConnected: true }), false);
  assert.equal(disposals, 0);
  assert.equal(disposeRendererIfCanvasDetached(renderer, { isConnected: false }), true);
  assert.equal(disposals, 1);
});

test("renderer initialization errors notify once and leave R3F's promise pending", async () => {
  const { bridgeRendererInitialization } = await importSourceModule(
    "rendering/rendererLifecycle.ts",
  );
  const error = new Error("renderer failed");
  const notifications = [];
  const bridged = bridgeRendererInitialization(Promise.reject(error), (received) => {
    notifications.push(received);
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(notifications, [error]);
  const state = await Promise.race([
    bridged.then(() => "resolved", () => "rejected"),
    new Promise((resolve) => setTimeout(() => resolve("pending"), 10)),
  ]);
  assert.equal(state, "pending");
});

test("each failed renderer initialization receives an independent pending promise", async () => {
  const { createPendingRendererInitialization } = await importSourceModule(
    "rendering/rendererLifecycle.ts",
  );
  const first = createPendingRendererInitialization();
  const second = createPendingRendererInitialization();

  assert.notEqual(first, second);
  const state = await Promise.race([
    Promise.all([first, second]).then(() => "resolved"),
    new Promise((resolve) => setTimeout(() => resolve("pending"), 10)),
  ]);
  assert.equal(state, "pending");
});

test("renderer error reporting is suppressed after its owner unmounts", async () => {
  const { reportRendererInitializationErrorIfMounted } = await importSourceModule(
    "rendering/rendererLifecycle.ts",
  );
  const reports = [];
  const error = new Error("late failure");

  assert.equal(
    reportRendererInitializationErrorIfMounted(() => false, (value) => reports.push(value), error),
    false,
  );
  assert.deepEqual(reports, []);
  assert.equal(
    reportRendererInitializationErrorIfMounted(() => true, (value) => reports.push(value), error),
    true,
  );
  assert.deepEqual(reports, [error]);
});

test("owned render pipeline cleanup disposes exactly once per cleanup call", async () => {
  const { disposeOwnedRenderPipeline } = await importSourceModule(
    "rendering/ownedRenderPipeline.ts",
  );
  let disposals = 0;
  disposeOwnedRenderPipeline({ dispose: () => { disposals += 1; } });
  assert.equal(disposals, 1);
});

test("simplified forces WebGL while full accepts WebGPU automatic fallback", async () => {
  const { initializeProfiledRenderer } = await importSourceModule("rendering/rendererProfile.ts");
  const forced = [];
  const simplified = await initializeProfiledRenderer("simplified", (forceWebGL) => {
    forced.push(forceWebGL);
    return { backend: forceWebGL ? { isWebGLBackend: true } : { isWebGPUBackend: true }, async init() {}, dispose() {} };
  });
  assert.equal(simplified.resolution.profile, "simplified");
  assert.deepEqual(forced, [true]);

  forced.length = 0;
  const fallback = await initializeProfiledRenderer("full", (forceWebGL) => {
    forced.push(forceWebGL);
    return { backend: { isWebGLBackend: true }, async init() {}, dispose() {} };
  });
  assert.equal(fallback.resolution.profile, "simplified");
  assert.deepEqual(forced, [false]);
});

test("full rejection is final because Three already attempted its internal fallback", async () => {
  const { initializeProfiledRenderer } = await importSourceModule("rendering/rendererProfile.ts");
  const forced = [];
  let disposeCount = 0;
  let attempts = 0;
  await assert.rejects(initializeProfiledRenderer("full", (forceWebGL) => {
    forced.push(forceWebGL);
    return {
      backend: {},
      async init() { attempts += 1; throw new Error("both backends failed"); },
      dispose() { disposeCount += 1; },
    };
  }), /both backends failed/);
  assert.deepEqual(forced, [false]);
  assert.equal(attempts, 1);
  assert.equal(disposeCount, 0);
});

test("visual settings default and legacy storage normalize to the full preset", async () => {
  const visual = await importSourceModule("space/spaceVisualSettings.ts");
  assert.deepEqual(visual.DEFAULT_SPACE_VISUAL_SETTINGS, { qualityPreset: "full" });
  assert.deepEqual(visual.normalizeSpaceVisualSettings({ antialias: false }), { qualityPreset: "full" });
  assert.deepEqual(visual.normalizeSpaceVisualSettings({ qualityPreset: "simplified" }), { qualityPreset: "simplified" });
});
