import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { sourcePath, importSourceModule } from "../helpers/projectPaths.mjs";
import { readSourceFile } from "../helpers/projectPaths.mjs";
import vm from "node:vm";
import ts from "typescript";
import * as THREE from "three";
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return {promise,resolve,reject}; };
const flush = () => new Promise(resolve => setImmediate(resolve));

test("latest particle generation owns preparation, readiness and disposal", async () => {
  assert.ok(existsSync(sourcePath("pages/works/WorkParticleSession.ts")), "persistent particle session is required");
  const { WorkParticleSession } = await importSourceModule("pages/works/WorkParticleSession.ts");
  const caches = new Map(), events = [], prep = deferred();
  const renderer = {
    whenSettled: async () => {},
    prepareTransition: async data => { events.push(`prepare:${data}`); if(data === "b") await prep.promise; },
    cancelPreparedTransition: () => events.push("cancel"),
    startIntro: () => events.push("intro"), update: () => events.push("frame"),
  };
  const session = new WorkParticleSession(renderer, id => { const d=deferred(); caches.set(id,d); return d.promise; }, Promise.resolve(), (id,state) => events.push(`${id}:${state}`));
  session.request("a"); session.request("b"); caches.get("a").resolve("a"); caches.get("b").resolve("b"); await flush();
  assert.ok(!events.includes("prepare:a")); assert.ok(!events.includes("b:ready"));
  session.request("c"); caches.get("c").resolve("c"); prep.resolve(); await flush(); await flush();
  assert.ok(events.includes("cancel")); assert.ok(!events.includes("b:ready"));
  assert.ok(events.indexOf("frame") < events.indexOf("c:ready")); assert.equal(events.at(-1), "c:ready");
  session.request("d"); session.dispose(); caches.get("d").resolve("d"); await flush();
  assert.ok(!events.includes("prepare:d")); assert.ok(!events.includes("d:ready"));
});

test("cache and initialization failures never announce ready", async () => {
  assert.ok(existsSync(sourcePath("pages/works/WorkParticleSession.ts")));
  const { WorkParticleSession } = await importSourceModule("pages/works/WorkParticleSession.ts");
  const events=[];
  const session=new WorkParticleSession({}, async () => { throw new Error("missing cache"); }, Promise.resolve(), (id,state,message)=>events.push({id,state,message}));
  session.request("a"); await flush();
  assert.equal(events.at(-1).state,"failed"); assert.equal(events.at(-1).message,"missing cache");
  session.dispose();
});

test("particle layers own their buffer geometry and release outgoing resources after the fade", async () => {
  const source=readSourceFile("particles/ParticlePointsRenderer.ts");
  const parsed=ts.createSourceFile("renderer.ts",source,ts.ScriptTarget.Latest,true);
  const cls=parsed.statements.find(s=>ts.isClassDeclaration(s));
  const js=ts.transpileModule(cls.getText(parsed).replace("export class","class"),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const Renderer=vm.runInNewContext(`${js}; ParticlePointsRenderer;`,{
    ...THREE, CAMERA_FOV:45,BASE_ELEVATION:0,FRAME_PADDING:1.15,CURSOR_LERP_PER_SEC:8,PARALLAX_LERP_PER_SEC:3,PARALLAX_SETTLE_EPSILON:1e-6,INTRO_DURATION_SEC:1,
    createParticleUniforms:()=>new Proxy({cursorNdc:{value:new THREE.Vector2(10,10)}},{get:(o,k)=>o[k]??=( {value:1} )}),
    createAmbientPointField:()=>({}),createParticlePointsMaterial:()=>new THREE.SpriteMaterial(),
    mergeModelAndGround:(a,n)=>({...a,totalCount:n}),
  });
  const renderer=new Renderer();renderer.groundEnabled=false;
  const renders=[],gpu={compileAsync:async()=>{},render:(scene)=>renders.push(scene.children.length),clearDepth(){},dispose(){}};
  renderer.renderer=gpu;
  const data={pointCount:2,boundsMin:[-1,-1,-1],boundsMax:[1,1,1],positions:new Float32Array(6),normals:new Float32Array(6),rands:new Float32Array(2)};
  renderer.setParticleData(data);
  const first=renderer.points, shared=new THREE.Sprite().geometry;
  assert.notEqual(first.geometry,shared,"per-layer geometry is needed to release its node attribute buffers without touching Three's shared sprite");
  let geometryDisposed=0,materialDisposed=0;
  first.geometry.addEventListener("dispose",()=>geometryDisposed++);first.material.addEventListener("dispose",()=>materialDisposed++);
  await renderer.prepareTransition(data);
  assert.equal(geometryDisposed,0,"retain old geometry while new material compiles");
  assert.notEqual(renderer.points.geometry,first.geometry);
  renderer.update(0);assert.equal(renders.length,1,"pending preparation renders the old layer only");
  renderer.startIntro();renderer.update(.4);assert.equal(geometryDisposed,0);
  let settled=false;const promise=renderer.whenSettled().then(()=>settled=true);await flush();assert.equal(settled,false);
  renderer.update(1.3);await promise;assert.equal(geometryDisposed,1);assert.equal(materialDisposed,1);assert.equal(renderer.outgoing,null);
  const current=renderer.points;let finalDisposed=0;current.geometry.addEventListener("dispose",()=>finalDisposed++);
  renderer.dispose();assert.equal(finalDisposed,1);
});
