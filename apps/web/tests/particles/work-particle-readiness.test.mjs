import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { readSourceFile } from "../helpers/projectPaths.mjs";

const source = readSourceFile("pages/works/WorkParticleHost.tsx");
const parsed = ts.createSourceFile("WorkParticleHost.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = parsed.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === "WorkParticleHost");
const javascript = ts.transpileModule(component.getText(parsed).replace("export function", "function").replaceAll("import.meta.env.DEV", "false"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText;
const flush = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function mount() {
  const init = deferred(), cache = deferred();
  const canvas = { dataset: {} };
  const events = [];
  let cleanup;
  const WorkParticleHost = vm.runInNewContext(`${javascript}; WorkParticleHost;`, {
    React,
    Error,
    useRef: () => ({ current: canvas }),
    useState: () => [false, () => {}],
    useEffect: (effect) => { cleanup = effect(); },
    ParticlePointsRenderer: class {
      init() { events.push("init"); return init.promise; }
      setParticleData() { events.push("data"); }
      startIntro() {}
      resize() {}
      dispose() { events.push("dispose"); }
    },
    particleCacheUrlFor: (id) => `/particles/${id}.particles.bin`,
    loadParticleCache: () => { events.push("cache"); return cache.promise; },
    window: { requestAnimationFrame: () => 1, cancelAnimationFrame() {}, addEventListener() {}, removeEventListener() {}, innerWidth: 390, innerHeight: 844, devicePixelRatio: 1 },
    document: { querySelector: () => null, getElementById: () => null, addEventListener() {}, removeEventListener() {} },
  });
  WorkParticleHost({ exhibitId: "arch_treehabitat", onReady: () => events.push("ready"), onError: (message) => events.push(`error:${message}`) });
  return { init, cache, canvas, events, cleanup: () => cleanup() };
}

test("particle readiness remains pending through renderer initialization and cache transfer", async () => {
  const host = mount();
  assert.equal(host.canvas.dataset.workParticleState, "pending");
  await flush();
  assert.deepEqual(host.events, ["init"]);
  assert.equal(host.canvas.dataset.workParticleState, "pending");
  host.init.resolve();
  await flush();
  assert.deepEqual(host.events, ["init", "cache"]);
  assert.equal(host.canvas.dataset.workParticleState, "pending");
  host.cache.resolve({ points: [] });
  await flush();
  assert.equal(host.canvas.dataset.workParticleState, "ready");
  assert.deepEqual(host.events, ["init", "cache", "data", "ready"]);
  host.cleanup();
});

test("particle failure and cancelled initialization never report ready", async () => {
  const failed = mount();
  failed.init.reject(new Error("GPU unavailable"));
  await flush();
  assert.notEqual(failed.canvas.dataset.workParticleState, "ready");
  assert.deepEqual(failed.events, ["init", "dispose", "error:GPU unavailable"]);
  const failedCache = mount();
  failedCache.init.resolve();
  await flush();
  failedCache.cache.reject(new Error("Cache transfer failed"));
  await flush();
  assert.notEqual(failedCache.canvas.dataset.workParticleState, "ready");
  assert.deepEqual(failedCache.events, ["init", "cache", "dispose", "error:Cache transfer failed"]);
  const cancelled = mount();
  cancelled.cleanup();
  cancelled.init.resolve();
  await flush();
  assert.notEqual(cancelled.canvas.dataset.workParticleState, "ready");
  assert.deepEqual(cancelled.events, ["init", "dispose"]);
});
