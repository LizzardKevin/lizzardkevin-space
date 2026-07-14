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

test("full disposes a rejected renderer and retries forced WebGL at most once", async () => {
  const { initializeProfiledRenderer } = await importSourceModule("rendering/rendererProfile.ts");
  const forced = [];
  let disposeCount = 0;
  const result = await initializeProfiledRenderer("full", (forceWebGL) => {
    forced.push(forceWebGL);
    return { backend: { isWebGLBackend: true }, async init() { if (!forceWebGL) throw new Error("WebGPU init failed"); }, dispose() { disposeCount += 1; } };
  });
  assert.equal(result.resolution.profile, "simplified");
  assert.deepEqual(forced, [false, true]);
  assert.equal(disposeCount, 1);

  let failedAttempts = 0;
  await assert.rejects(initializeProfiledRenderer("full", () => ({
    backend: { isWebGLBackend: true }, async init() { failedAttempts += 1; throw new Error("still failed"); }, dispose() {},
  })), /still failed/);
  assert.equal(failedAttempts, 2);
});

test("visual settings default and legacy storage normalize to the full preset", async () => {
  const visual = await importSourceModule("space/spaceVisualSettings.ts");
  assert.deepEqual(visual.DEFAULT_SPACE_VISUAL_SETTINGS, { qualityPreset: "full" });
  assert.deepEqual(visual.normalizeSpaceVisualSettings({ antialias: false }), { qualityPreset: "full" });
  assert.deepEqual(visual.normalizeSpaceVisualSettings({ qualityPreset: "simplified" }), { qualityPreset: "simplified" });
});
