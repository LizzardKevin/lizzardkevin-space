import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const moduleUrl = new URL("../../src/desktop/idleRoutePrefetch.ts", import.meta.url);

async function loadControllerFactory() {
  assert.equal(existsSync(moduleUrl), true, "idleRoutePrefetch.ts must implement the one-shot scheduler");
  return import(moduleUrl.href);
}

function createHarness(createIdleRoutePrefetchController) {
  const callbacks = [];
  const cancelled = [];
  let imports = 0;
  const controller = createIdleRoutePrefetchController({
    idleApi: {
      request(callback) {
        callbacks.push(callback);
        return callbacks.length;
      },
      cancel(handle) {
        cancelled.push(handle);
      },
    },
    importers: [
      async () => {
        imports += 1;
      },
      async () => {
        imports += 1;
      },
    ],
  });
  return {
    callbacks,
    cancelled,
    controller,
    get imports() {
      return imports;
    },
  };
}

test("idle and booting phases do not schedule route prefetch", async () => {
  const { createIdleRoutePrefetchController } = await loadControllerFactory();
  const harness = createHarness(createIdleRoutePrefetchController);
  harness.controller.update({ attemptId: 0, phase: "idle" });
  harness.controller.update({ attemptId: 1, phase: "booting" });
  assert.equal(harness.callbacks.length, 0);
});

test("running schedules one idle callback", async () => {
  const { createIdleRoutePrefetchController } = await loadControllerFactory();
  const harness = createHarness(createIdleRoutePrefetchController);
  harness.controller.update({ attemptId: 1, phase: "running" });
  harness.controller.update({ attemptId: 1, phase: "running" });
  assert.equal(harness.callbacks.length, 1);
});

test("cancelling before the idle callback prevents imports", async () => {
  const { createIdleRoutePrefetchController } = await loadControllerFactory();
  const harness = createHarness(createIdleRoutePrefetchController);
  harness.controller.update({ attemptId: 1, phase: "running" });
  harness.controller.cancel();
  harness.callbacks[0]();
  await Promise.resolve();
  assert.deepEqual(harness.cancelled, [1]);
  assert.equal(harness.imports, 0);
});

test("an attempt change cancels pending work and permits the new running attempt", async () => {
  const { createIdleRoutePrefetchController } = await loadControllerFactory();
  const harness = createHarness(createIdleRoutePrefetchController);
  harness.controller.update({ attemptId: 1, phase: "running" });
  harness.controller.update({ attemptId: 2, phase: "running" });
  assert.deepEqual(harness.cancelled, [1]);
  assert.equal(harness.callbacks.length, 2);
  harness.callbacks[0]();
  harness.callbacks[1]();
  await Promise.resolve();
  assert.equal(harness.imports, 2);
});

test("callbacks and later phase changes cannot repeat completed imports", async () => {
  const { createIdleRoutePrefetchController } = await loadControllerFactory();
  const harness = createHarness(createIdleRoutePrefetchController);
  harness.controller.update({ attemptId: 1, phase: "running" });
  harness.callbacks[0]();
  harness.callbacks[0]();
  harness.controller.update({ attemptId: 1, phase: "idle" });
  harness.controller.update({ attemptId: 2, phase: "running" });
  await Promise.resolve();
  assert.equal(harness.callbacks.length, 1);
  assert.equal(harness.imports, 2);
});

test("unsupported idle scheduling skips prefetch", async () => {
  const { createIdleRoutePrefetchController } = await loadControllerFactory();
  let imports = 0;
  const controller = createIdleRoutePrefetchController({
    idleApi: null,
    importers: [async () => { imports += 1; }],
  });
  controller.update({ attemptId: 1, phase: "running" });
  await Promise.resolve();
  assert.equal(imports, 0);
});
