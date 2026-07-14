import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const pointerLockSource = readFileSync(
  resolve(root, "apps/web/src/space/requestSpacePointerLock.ts"),
  "utf8",
);
const moduleBodyStart = pointerLockSource.indexOf("let nextPointerLockRequestId");
assert.ok(moduleBodyStart >= 0, "pointer-lock request state must remain executable in the test harness");

let moduleNonce = 0;

async function importPointerLockModule() {
  const dependencyPrelude = `
    const {
      POINTER_LOCK_RESUME_TIMEOUT_MS,
      isPermanentPointerLockFailure,
      requestPointerLockWithRawFallback,
      requestSpaceCursorReturn,
      resolveSpacePointerLockTarget,
    } = globalThis.__SPACE_POINTER_LOCK_TEST_DEPENDENCIES__;
  `;
  const output = ts.transpileModule(
    `${dependencyPrelude}\n${pointerLockSource.slice(moduleBodyStart)}`,
    { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  moduleNonce += 1;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}#${moduleNonce}`);
}

async function withMockedPointerLockBrowser(requestPointerLockWithRawFallback, run) {
  const names = [
    "CustomEvent",
    "document",
    "queueMicrotask",
    "window",
    "__SPACE_POINTER_LOCK_TEST_DEPENDENCIES__",
  ];
  const originals = new Map(
    names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]),
  );
  const canvas = { id: "space-canvas" };
  const events = [];
  const microtasks = [];
  const timers = [];

  class MockCustomEvent {
    constructor(type, init = {}) {
      this.detail = init.detail;
      this.type = type;
    }
  }

  const globals = {
    CustomEvent: MockCustomEvent,
    document: { pointerLockElement: null },
    queueMicrotask: (callback) => microtasks.push(callback),
    window: {
      dispatchEvent: (event) => {
        events.push(event);
        return true;
      },
      setTimeout: (callback) => {
        timers.push(callback);
        return timers.length;
      },
    },
    __SPACE_POINTER_LOCK_TEST_DEPENDENCIES__: {
      POINTER_LOCK_RESUME_TIMEOUT_MS: 900,
      isPermanentPointerLockFailure: () => false,
      requestPointerLockWithRawFallback,
      requestSpaceCursorReturn: () => {},
      resolveSpacePointerLockTarget: () => canvas,
    },
  };

  try {
    for (const [name, value] of Object.entries(globals)) {
      Object.defineProperty(globalThis, name, { configurable: true, value, writable: true });
    }
    const pointerLock = await importPointerLockModule();
    await run({ canvas, events, microtasks, pointerLock, timers });
  } finally {
    for (const name of names) {
      const original = originals.get(name);
      if (original) Object.defineProperty(globalThis, name, original);
      else delete globalThis[name];
    }
  }
}

test("reserved and explicit pointer-lock request IDs survive failure reporting", async () => {
  await withMockedPointerLockBrowser((_canvas, onError) => onError("mock rejection"), ({
    events,
    pointerLock,
  }) => {
    const reservedRequestId = pointerLock.reserveSpacePointerLockRequestId();
    const explicitRequestId = 801;

    assert.equal(pointerLock.requestSpacePointerLock(reservedRequestId), reservedRequestId);
    assert.equal(pointerLock.requestSpacePointerLock(explicitRequestId), explicitRequestId);
    assert.deepEqual(
      events.map((event) => ({ detail: event.detail, type: event.type })),
      [
        {
          detail: { message: "mock rejection", permanent: false, requestId: reservedRequestId },
          type: pointerLock.SPACE_POINTER_LOCK_FAILED_EVENT,
        },
        {
          detail: { message: "mock rejection", permanent: false, requestId: explicitRequestId },
          type: pointerLock.SPACE_POINTER_LOCK_FAILED_EVENT,
        },
      ],
    );
  });
});

test("an older timeout cannot report itself as the newer pointer-lock request", async () => {
  await withMockedPointerLockBrowser(() => {}, ({ events, pointerLock, timers }) => {
    assert.equal(pointerLock.requestSpacePointerLock(101), 101);
    assert.equal(pointerLock.requestSpacePointerLock(202), 202);
    assert.equal(timers.length, 2);

    timers[0]();
    assert.deepEqual(events, []);

    timers[1]();
    assert.equal(events.length, 1);
    assert.equal(events[0].detail.requestId, 202);
  });
});
