import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { readSourceFile } from "../helpers/projectPaths.mjs";
import { WorkParticleSession } from "../../src/pages/works/WorkParticleSession.ts";
const source = readSourceFile("pages/works/WorkParticleHost.tsx");
const parsed = ts.createSourceFile("host.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = parsed.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === "WorkParticleHost");
const javascript = ts.transpileModule(component.getText(parsed).replace("export function", "function").replaceAll("import.meta.env.DEV", "false"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
}).outputText;
const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes,no) => { resolve=yes; reject=no; });
  return { promise, resolve, reject };
}
function mount() {
  const init = deferred(), caches = new Map(), events = [], canvases = [];
  const host = { dataset: {}, appendChild() {} };
  const refs=[], effects=[], pending=[];
  let refCursor=0, effectCursor=0;
  const effect = (fn,deps) => {
    const slot=effectCursor++, previous=effects[slot];
    if (!previous || deps.some((dep,i)=>dep!==previous.deps[i])) pending.push(()=>{
      previous?.cleanup?.(); effects[slot]={deps,cleanup:fn()};
    });
  };
  const renderHost = vm.runInNewContext(`${javascript}; WorkParticleHost;`, {
    React, Error, WorkParticleSession, prefersReducedMotion:()=>false,
    useRef: initial => { const slot=refCursor++; return refs[slot] ??= {current:initial}; },
    useState: initial => [initial, () => {}],
    useEffect:effect, useLayoutEffect:effect,
    ParticlePointsRenderer: class {
      init() { events.push("init"); return init.promise; }
      whenSettled() { return Promise.resolve(); }
      prepareTransition(data) { events.push("data:"+data); return Promise.resolve(); }
      cancelPreparedTransition() {}
      startIntro() { events.push("intro"); }
      update() { events.push("frame"); }
      resize() {} setMorphProgress() {}
      dispose() { events.push("dispose"); }
    },
    particleCacheUrlFor:id=>id,
    loadParticleCache:id=>{const cache=deferred();caches.set(id,cache);events.push("cache:"+id);return cache.promise;},
    requestAnimationFrame:()=>1, cancelAnimationFrame(){}, devicePixelRatio:1,
    window:{addEventListener(){},removeEventListener(){},innerWidth:1440,innerHeight:900},
    document:{hidden:false,querySelector:()=>null,getElementById:()=>null,addEventListener(){},removeEventListener(){},
      createElement:()=>{const canvas={dataset:{},style:{},setAttribute(){},remove(){canvas.removed=true;}};canvases.push(canvas);return canvas;}},
  });
  const render = id => {
    refCursor=effectCursor=0;
    renderHost({exhibitId:id,onReady:()=>events.push("ready:"+id),onError:message=>events.push("error:"+message)});
    refs[0].current=host; pending.splice(0).forEach(run=>run());
  };
  render("tree");
  return {init,caches,get canvas(){return canvases.at(-1) ?? host;},canvases,events,render,
    restart:()=>{effects.toReversed().forEach(e=>e.cleanup?.());effects.length=0;render("tree");},
    cleanup:()=>effects.toReversed().forEach(e=>e.cleanup?.())};
}
test("StrictMode initialization generations own distinct canvases", () => {
  const host=mount(); const first=host.canvas;
  host.restart();
  assert.equal(host.canvases.length,2,"each init must acquire its own canvas/context");
  assert.notEqual(first,host.canvas);assert.equal(first.removed,true);
  host.cleanup();
});
test("readiness waits for both cache and GPU, while work/callback changes reuse the renderer", async () => {
  const host=mount();
  assert.equal(host.canvas.dataset.workParticleState,"pending");
  host.caches.get("tree").resolve("tree"); await flush();
  assert.ok(!host.events.includes("ready:tree"));
  host.init.resolve(); await flush(); await flush();
  assert.equal(host.canvas.dataset.workParticleState,"ready");
  assert.ok(host.events.indexOf("frame") < host.events.indexOf("ready:tree"));
  host.render("uabb"); assert.equal(host.canvas.dataset.workParticleState,"pending");
  assert.equal(host.events.filter(e=>e==="init").length,1);
  assert.equal(host.events.filter(e=>e==="dispose").length,0);
  host.caches.get("uabb").resolve("uabb"); await flush(); await flush();
  assert.equal(host.canvas.dataset.workParticleExhibit,"uabb");
  host.cleanup(); assert.equal(host.events.filter(e=>e==="dispose").length,1);
});
test("failed and cancelled initialization cannot announce readiness", async () => {
  const failed=mount();failed.init.reject(new Error("GPU unavailable"));await flush();
  assert.equal(failed.canvas.dataset.workParticleState,"failed");
  assert.ok(failed.events.includes("error:GPU unavailable"));failed.cleanup();
  const cancelled=mount();cancelled.cleanup();cancelled.init.resolve();cancelled.caches.get("tree").resolve("tree");await flush();
  assert.ok(!cancelled.events.includes("ready:tree"));assert.ok(!cancelled.events.includes("data:tree"));
});
