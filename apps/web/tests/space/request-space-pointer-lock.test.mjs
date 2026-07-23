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
  const cursorReturns = [];
  const events = [];
  const listeners = new Map();
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
    document: {
      pointerLockElement: null,
      addEventListener: (type, listener) => {
        const typeListeners = listeners.get(`document:${type}`) ?? new Set();
        typeListeners.add(listener);
        listeners.set(`document:${type}`, typeListeners);
      },
      removeEventListener: (type, listener) => listeners.get(`document:${type}`)?.delete(listener),
    },
    queueMicrotask: (callback) => microtasks.push(callback),
    window: {
      addEventListener: (type, listener) => {
        const typeListeners = listeners.get(type) ?? new Set();
        typeListeners.add(listener);
        listeners.set(type, typeListeners);
      },
      clearTimeout: (timerId) => {
        const timer = timers[timerId - 1];
        if (timer) timer.cancelled = true;
      },
      dispatchEvent: (event) => {
        if (event.type === "space:pointer-lock-failed") events.push(event);
        for (const listener of [...(listeners.get(event.type) ?? [])]) listener(event);
        return true;
      },
      removeEventListener: (type, listener) => listeners.get(type)?.delete(listener),
      setTimeout: (callback) => {
        timers.push({ callback, cancelled: false, ran: false });
        return timers.length;
      },
    },
    __SPACE_POINTER_LOCK_TEST_DEPENDENCIES__: {
      POINTER_LOCK_RESUME_TIMEOUT_MS: 900,
      isPermanentPointerLockFailure: () => false,
      requestPointerLockWithRawFallback,
      requestSpaceCursorReturn: (options) => cursorReturns.push(options),
      resolveSpacePointerLockTarget: () => canvas,
    },
  };

  try {
    for (const [name, value] of Object.entries(globals)) {
      Object.defineProperty(globalThis, name, { configurable: true, value, writable: true });
    }
    const pointerLock = await importPointerLockModule();
    const dispatchWindowEvent = (type, detail = {}) => globals.window.dispatchEvent({
      ...detail,
      type,
    });
    const runTimer = (timerId) => {
      const timer = timers[timerId - 1];
      if (!timer || timer.cancelled || timer.ran) return false;
      timer.ran = true;
      timer.callback();
      return true;
    };
    const runAllTimers = () => {
      for (let timerId = 1; timerId <= timers.length; timerId += 1) runTimer(timerId);
    };
    await run({
      activeTimerCount: () => timers.filter((timer) => !timer.cancelled && !timer.ran).length,
      canvas,
      cursorReturns,
      dispatchWindowEvent,
      events,
      listenerCount: (type) => listeners.get(type)?.size ?? 0,
      microtasks,
      pointerLock,
      runAllTimers,
      runTimer,
      timers,
    });
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
  await withMockedPointerLockBrowser(() => {}, ({ events, pointerLock, runTimer, timers }) => {
    assert.equal(pointerLock.requestSpacePointerLock(101), 101);
    assert.equal(pointerLock.requestSpacePointerLock(202), 202);
    assert.equal(timers.length, 2);

    runTimer(1);
    assert.deepEqual(events, []);

    runTimer(2);
    assert.equal(events.length, 1);
    assert.equal(events[0].detail.requestId, 202);
  });
});

for (const lifecycleEvent of ["blur", "pagehide"]) {
  test(`a lost Escape keyup is cancelled on ${lifecycleEvent}`, async () => {
    const pointerLockCalls = [];
    await withMockedPointerLockBrowser(
      (canvas) => pointerLockCalls.push(canvas),
      ({ dispatchWindowEvent, listenerCount, pointerLock, runAllTimers }) => {
        assert.equal(
          pointerLock.resumeSpaceFirstPersonAfterEscape(
            { entered: true, overlayOpen: false },
            301,
          ),
          301,
        );
        dispatchWindowEvent(lifecycleEvent);
        dispatchWindowEvent("keyup", { key: "Escape" });
        runAllTimers();
        assert.equal(pointerLockCalls.length, 0);
        assert.equal(listenerCount("keyup"), 0);
        assert.equal(listenerCount("blur"), 0);
        assert.equal(listenerCount("pagehide"), 0);
      },
    );
  });
}

test("a newer Escape recovery cancels the older pending recovery", async () => {
  const pointerLockCalls = [];
  await withMockedPointerLockBrowser(
    (canvas, onError) => {
      pointerLockCalls.push(canvas);
      onError("mock rejection");
    },
    ({ dispatchWindowEvent, events, listenerCount, pointerLock, runAllTimers }) => {
      pointerLock.resumeSpaceFirstPersonAfterEscape(
        { entered: true, overlayOpen: false },
        401,
      );
      pointerLock.resumeSpaceFirstPersonAfterEscape(
        { entered: true, overlayOpen: false },
        402,
      );
      assert.equal(listenerCount("keyup"), 1);
      assert.equal(listenerCount("blur"), 1);
      assert.equal(listenerCount("pagehide"), 1);
      dispatchWindowEvent("keyup", { key: "Escape" });
      runAllTimers();

      assert.equal(pointerLockCalls.length, 1);
      assert.deepEqual(events.map((event) => event.detail.requestId), [402]);
    },
  );
});

test("a normal pointer-lock request cancels an older pending Escape recovery", async () => {
  const pointerLockCalls = [];
  await withMockedPointerLockBrowser(
    (canvas) => pointerLockCalls.push(canvas),
    ({ dispatchWindowEvent, listenerCount, pointerLock, runAllTimers }) => {
      pointerLock.resumeSpaceFirstPersonAfterEscape(
        { entered: true, overlayOpen: false },
        451,
      );

      assert.equal(pointerLock.requestSpacePointerLock(452), 452);
      dispatchWindowEvent("keyup", { key: "Escape" });
      runAllTimers();

      assert.equal(pointerLockCalls.length, 1);
      assert.equal(listenerCount("keyup"), 0);
      assert.equal(listenerCount("blur"), 0);
      assert.equal(listenerCount("pagehide"), 0);
    },
  );
});

for (const lifecycleEvent of ["blur", "pagehide"]) {
  test(`${lifecycleEvent} cancels pending Escape recovery before keyup`, async () => {
    const pointerLockCalls = [];
    await withMockedPointerLockBrowser(
      (canvas) => pointerLockCalls.push(canvas),
      ({ dispatchWindowEvent, listenerCount, pointerLock, runAllTimers }) => {
        pointerLock.resumeSpaceFirstPersonAfterEscape(
          { entered: true, overlayOpen: false },
          501,
        );
        dispatchWindowEvent(lifecycleEvent);
        dispatchWindowEvent("keyup", { key: "Escape" });
        runAllTimers();
        assert.equal(pointerLockCalls.length, 0);
        assert.equal(listenerCount("keyup"), 0);
        assert.equal(listenerCount("blur"), 0);
        assert.equal(listenerCount("pagehide"), 0);
      },
    );
  });
}

test("Escape recovery expires after one bounded timeout when keyup is lost", async () => {
  const pointerLockCalls = [];
  await withMockedPointerLockBrowser(
    (canvas) => pointerLockCalls.push(canvas),
    ({ activeTimerCount, dispatchWindowEvent, listenerCount, pointerLock, runAllTimers }) => {
      pointerLock.resumeSpaceFirstPersonAfterEscape(
        { entered: true, overlayOpen: false },
        601,
      );
      assert.equal(activeTimerCount(), 1);
      runAllTimers();
      dispatchWindowEvent("keyup", { key: "Escape" });
      runAllTimers();
      assert.equal(pointerLockCalls.length, 0);
      assert.equal(listenerCount("keyup"), 0);
      assert.equal(listenerCount("blur"), 0);
      assert.equal(listenerCount("pagehide"), 0);
    },
  );
});

test("ordinary Escape keyup issues one correlated pointer-lock request", async () => {
  const pointerLockCalls = [];
  await withMockedPointerLockBrowser(
    (canvas, onError) => {
      pointerLockCalls.push(canvas);
      onError("mock rejection");
    },
    ({ cursorReturns, dispatchWindowEvent, events, listenerCount, pointerLock, runAllTimers }) => {
      assert.equal(
        pointerLock.resumeSpaceFirstPersonAfterEscape(
          { entered: true, overlayOpen: false },
          701,
        ),
        701,
      );
      dispatchWindowEvent("keyup", { key: "Escape" });
      assert.deepEqual(cursorReturns, [{ target: "center" }]);
      // keyup 当帧请求锁定（不再延迟 500ms）
      assert.equal(pointerLockCalls.length, 1);
      runAllTimers();

      assert.equal(pointerLockCalls.length, 1);
      assert.deepEqual(events.map((event) => event.detail.requestId), [701]);
      assert.equal(listenerCount("keyup"), 0);
      assert.equal(listenerCount("blur"), 0);
      assert.equal(listenerCount("pagehide"), 0);
    },
  );
});
