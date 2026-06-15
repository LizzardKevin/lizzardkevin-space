import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const helperPath = new URL("../apps/web/src/components/frostedSplit/wheelPaging.ts", import.meta.url);
const source = readFileSync(helperPath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    strict: true,
  },
});

const module = { exports: {} };
vm.runInNewContext(compiled.outputText, { module, exports: module.exports }, { filename: "wheelPaging.ts" });

const {
  beginDragPaging,
  createDragPagingState,
  createWheelPagingState,
  getRelativeSelectionDirection,
  releaseDragPaging,
  resolveDragPaging,
  resolveWheelPaging,
} = module.exports;

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function step(state, input) {
  return plain(resolveWheelPaging(state, {
    currentIndex: 1,
    total: 4,
    ...input,
  }));
}

{
  const state = createWheelPagingState();
  assert.deepEqual(step(state, { deltaY: 80, nowMs: 0 }), {
    kind: "track",
    direction: "down",
    progress: 0.5,
  });
  assert.deepEqual(step(state, { deltaY: 70, nowMs: 120 }), {
    kind: "track",
    direction: "down",
    progress: 0.9375,
  });
  assert.deepEqual(step(state, { deltaY: 20, nowMs: 240 }), {
    kind: "select",
    direction: "down",
    nextIndex: 2,
  });
}

{
  const state = createWheelPagingState();
  assert.equal(step(state, { deltaY: 170, nowMs: 0 }).kind, "select");
  assert.deepEqual(step(state, { deltaY: 190, nowMs: 200 }), { kind: "locked" });
  assert.deepEqual(step(state, { deltaY: 190, nowMs: 420 }), { kind: "locked" });
  assert.deepEqual(step(state, { deltaY: -170, nowMs: 720 }), {
    kind: "select",
    direction: "up",
    nextIndex: 0,
  });
}

{
  const state = createWheelPagingState();
  assert.deepEqual(
    plain(resolveWheelPaging(state, { currentIndex: 0, total: 4, deltaY: -180, nowMs: 0 })),
    { kind: "rebound", direction: "up" },
  );
  assert.deepEqual(
    plain(resolveWheelPaging(state, { currentIndex: 0, total: 4, deltaY: -180, nowMs: 120 })),
    { kind: "locked" },
  );
  assert.deepEqual(
    plain(resolveWheelPaging(state, { currentIndex: 3, total: 4, deltaY: 180, nowMs: 520 })),
    { kind: "rebound", direction: "down" },
  );
}

{
  const state = createWheelPagingState();
  assert.deepEqual(step(state, { deltaY: 100, nowMs: 0 }), {
    kind: "track",
    direction: "down",
    progress: 0.625,
  });
  assert.deepEqual(step(state, { deltaY: 100, nowMs: 420 }), {
    kind: "track",
    direction: "down",
    progress: 0.625,
  });
}

{
  const state = createWheelPagingState();
  assert.deepEqual(step(state, { deltaY: 60, nowMs: 0 }), {
    kind: "track",
    direction: "down",
    progress: 0.375,
  });
  assert.deepEqual(step(state, { deltaY: -50, nowMs: 120 }), {
    kind: "track",
    direction: "up",
    progress: 0.3125,
  });
}

{
  assert.equal(getRelativeSelectionDirection(1, 3), "down");
  assert.equal(getRelativeSelectionDirection(3, 1), "up");
  assert.equal(getRelativeSelectionDirection(2, 2), null);
}

{
  const state = createDragPagingState();
  beginDragPaging(state, { pointerY: 300, nowMs: 0 });
  assert.deepEqual(
    plain(resolveDragPaging(state, { currentIndex: 1, total: 4, pointerY: 230, nowMs: 80 })),
    { kind: "track", direction: "down", progress: 0.4375 },
  );
  assert.deepEqual(plain(releaseDragPaging(state)), {
    kind: "settle",
    direction: "down",
  });
}

{
  const state = createDragPagingState();
  beginDragPaging(state, { pointerY: 300, nowMs: 0 });
  assert.deepEqual(
    plain(resolveDragPaging(state, { currentIndex: 1, total: 4, pointerY: 120, nowMs: 90 })),
    { kind: "select", direction: "down", nextIndex: 2 },
  );
  assert.deepEqual(
    plain(resolveDragPaging(state, { currentIndex: 2, total: 4, pointerY: -80, nowMs: 140 })),
    { kind: "locked" },
  );
}

{
  const state = createDragPagingState();
  beginDragPaging(state, { pointerY: 200, nowMs: 0 });
  assert.deepEqual(
    plain(resolveDragPaging(state, { currentIndex: 0, total: 4, pointerY: 380, nowMs: 90 })),
    { kind: "rebound", direction: "up" },
  );
}

console.log("frosted split wheel paging tests passed");
