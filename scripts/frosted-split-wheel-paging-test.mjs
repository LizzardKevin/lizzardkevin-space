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

const { createWheelPagingState, resolveWheelPaging } = module.exports;

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
  assert.deepEqual(step(state, { deltaY: 80, nowMs: 0 }), { kind: "idle" });
  assert.deepEqual(step(state, { deltaY: 70, nowMs: 120 }), { kind: "idle" });
  assert.deepEqual(step(state, { deltaY: 20, nowMs: 240 }), {
    kind: "select",
    direction: "down",
    nextIndex: 2,
  });
}

{
  const state = createWheelPagingState();
  assert.equal(step(state, { deltaY: 170, nowMs: 0 }).kind, "select");
  assert.deepEqual(step(state, { deltaY: 190, nowMs: 200 }), { kind: "idle" });
  assert.deepEqual(step(state, { deltaY: -170, nowMs: 700 }), {
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
    plain(resolveWheelPaging(state, { currentIndex: 3, total: 4, deltaY: 180, nowMs: 700 })),
    { kind: "rebound", direction: "down" },
  );
}

{
  const state = createWheelPagingState();
  assert.deepEqual(step(state, { deltaY: 100, nowMs: 0 }), { kind: "idle" });
  assert.deepEqual(step(state, { deltaY: 100, nowMs: 420 }), { kind: "idle" });
}

console.log("frosted split wheel paging tests passed");
