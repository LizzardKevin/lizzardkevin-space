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

test("readiness needs outgoing completion even after compilation, and cancellation wins during exit", async () => {
  const { WorkParticleSession } = await importSourceModule("pages/works/WorkParticleSession.ts");
  const events=[], exit=deferred(); let preparing=false;
  const renderer={whenSettled:()=>preparing ? exit.promise : Promise.resolve(),
    prepareTransition:async()=>{preparing=true;},cancelPreparedTransition:()=>{events.push('cancel');preparing=false;},
    startIntro:()=>events.push('intro'),update:()=>{}};
  const session=new WorkParticleSession(renderer,async id=>id,Promise.resolve(),(id,state)=>events.push(`${id}:${state}`));
  session.request('a');await flush();assert.ok(!events.includes('a:ready'));
  session.request('b');exit.resolve();await flush();await flush();
  assert.ok(!events.includes('a:ready'));assert.equal(events.at(-1),'b:ready');
  session.dispose();
});

test("superseded loads and unmount receive abort signals", async () => {
  const { WorkParticleSession } = await importSourceModule("pages/works/WorkParticleSession.ts");
  const signals=[];
  const session=new WorkParticleSession({},(_id,signal)=>{signals.push(signal);return new Promise(()=>{});},Promise.resolve(),()=>{});
  session.request('a');session.request('b');
  assert.equal(signals[0]?.aborted,true);
  session.dispose();assert.equal(signals[1]?.aborted,true);
});

test("GPU deadline rejects stalled work and clears its timer after normal completion", async () => {
  assert.ok(existsSync(sourcePath('particles/particleDeadline.ts')));
  const { particleDeadline } = await importSourceModule('particles/particleDeadline.ts');
  await assert.rejects(particleDeadline(new Promise(()=>{}),5), /timed out/);
  assert.equal(await particleDeadline(Promise.resolve('compiled'),1000),'compiled');
});

function rendererFixture() {
  const source=readSourceFile("particles/ParticlePointsRenderer.ts");
  const parsed=ts.createSourceFile("renderer.ts",source,ts.ScriptTarget.Latest,true);
  const cls=parsed.statements.find(s=>ts.isClassDeclaration(s));
  const js=ts.transpileModule(cls.getText(parsed).replace("export class","class"),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const Renderer=vm.runInNewContext(`${js}; ParticlePointsRenderer;`,{
    ...THREE, CAMERA_FOV:45,BASE_ELEVATION:0,FRAME_PADDING:1.15,CURSOR_LERP_PER_SEC:8,PARALLAX_LERP_PER_SEC:3,PARALLAX_SETTLE_EPSILON:1e-6,INTRO_DURATION_SEC:1,
    particleDeadline:work=>work,
    createParticleUniforms:()=>new Proxy({cursorNdc:{value:new THREE.Vector2(10,10)},groundShift:{value:new THREE.Vector3()},groundScatterShift:{value:new THREE.Vector3()}},{get:(o,k)=>o[k]??=( {value:1} )}),
    createAmbientPointField:()=>({}),createParticlePointsMaterial:()=>new THREE.SpriteMaterial(),
    buildModelParticleArrays:(a,n)=>({...a,totalCount:n}),
    createGroundPointField:()=>({}),
    modelProjectionBounds:()=>({}), GROUND_STYLE:{farClipFactor:160},
    groundFrameTransform:()=>({scale:1,shift:[0,0,0],scatterScale:1,scatterShift:[0,0,0]}),
    sampleProjectedDensity:(a)=>({...a,pointCount:a.rands.length,pointSize:.05}),
  });
  const renderer=new Renderer();
  const renders=[],gpu={compileAsync:async()=>{},render:(scene)=>renders.push({scene, opacity:renderer.outgoing?.uniforms.layerOpacity.value, intro:renderer.uniforms.introProgress.value}),clearDepth(){},dispose(){},setPixelRatio(){},setSize(){}};
  renderer.renderer=gpu;
  const data={pointCount:2,boundsMin:[-1,-1,-1],boundsMax:[1,1,1],positions:new Float32Array(6),normals:new Float32Array(6),rands:new Float32Array(2)};
  renderer.setParticleData(data);
  return {renderer,gpu,renders,data};
}

test("particle layers own their buffer geometry and release outgoing resources after the fade", async () => {
  const {renderer,renders,data}=rendererFixture();
  const first=renderer.points, shared=new THREE.Sprite().geometry;
  assert.notEqual(first.geometry,shared,"per-layer geometry is needed to release its node attribute buffers without touching Three's shared sprite");
  let geometryDisposed=0,materialDisposed=0;
  first.geometry.addEventListener("dispose",()=>geometryDisposed++);first.material.addEventListener("dispose",()=>materialDisposed++);
  await renderer.prepareTransition(data);
  assert.equal(geometryDisposed,0,"retain old geometry while new material compiles");
  assert.notEqual(renderer.points.geometry,first.geometry);
  renderer.update(0);assert.equal(renders.length,1,"pending preparation renders the old layer only");
  renderer.update(.4);assert.equal(geometryDisposed,0);
  assert.equal(renderer.uniforms.introProgress.value,0,"incoming remains fully hidden during outgoing fade");
  assert.ok(renderer.outgoing.uniforms.layerOpacity.value < 1,"outgoing fades while incoming is prepared");
  assert.ok(renders.every(frame=>frame.scene!==renderer.scene),"no incoming draw before outgoing-complete");
  let settled=false;const promise=renderer.whenSettled().then(()=>settled=true);await flush();assert.equal(settled,false);
  renderer.update(1.3);await promise;assert.equal(geometryDisposed,1);assert.equal(materialDisposed,1);assert.equal(renderer.outgoing,null);
  renderer.startIntro();renderer.update(.1);
  assert.ok(renderer.uniforms.introProgress.value > 0);
  const current=renderer.points;let finalDisposed=0;current.geometry.addEventListener("dispose",()=>finalDisposed++);
  renderer.dispose();assert.equal(finalDisposed,1);
});

test("aspect changes reframe both live and outgoing layers without rebuilding particle membership",async()=>{
  const {renderer,data}=rendererFixture();renderer.resize(1440,900,1);
  const wide=renderer.baseDistance,points=renderer.points;
  renderer.resize(700,900,1);
  assert.ok(renderer.baseDistance > wide*1.2,'narrow horizontal FOV needs greater view distance');
  assert.equal(renderer.points,points,'resize must not resample or recreate particles');
  await renderer.prepareTransition(data);
  const oldDistance=renderer.outgoing.distance;
  renderer.resize(1920,1080,1);
  assert.ok(renderer.outgoing.distance < oldDistance,'outgoing framing follows aspect changes too');
  renderer.dispose();
});

test("slow compilation waits on real readiness after the outgoing layer has disappeared", async()=>{
  const {renderer,gpu,data,renders}=rendererFixture(); const compile=deferred();gpu.compileAsync=()=>compile.promise;
  let ready=false;const prep=renderer.prepareTransition(data).then(()=>ready=true);
  renderer.update(.9);await renderer.whenSettled();assert.equal(ready,false);
  assert.equal(renderer.outgoing,null);assert.equal(renderer.uniforms.introProgress.value,0);
  const draws=renders.length;renderer.update(1);assert.equal(renders.length,draws,"waiting must not draw incoming particles");
  compile.resolve();await prep;renderer.startIntro();renderer.update(.2);assert.ok(renderer.uniforms.introProgress.value>0);renderer.dispose();
});

test("cancelled incoming geometry releases once without restoring the exiting model",async()=>{
  const {renderer,data}=rendererFixture();await renderer.prepareTransition(data);renderer.update(.3);
  const old=renderer.outgoing,opacity=old.uniforms.layerOpacity.value,next=renderer.points;let released=0;
  next.geometry.addEventListener('dispose',()=>released++);renderer.cancelPreparedTransition();
  assert.equal(renderer.points,null);assert.equal(renderer.outgoing,old);assert.equal(old.uniforms.layerOpacity.value,opacity);
  renderer.update(.6);assert.equal(renderer.outgoing,null);renderer.dispose();assert.equal(released,1);
});

test("compile failure and disposal retire all layers, while reduced motion still renders one layer per frame",async()=>{
  const failed=rendererFixture();failed.gpu.compileAsync=async()=>{throw new Error('compile failed');};
  await assert.rejects(failed.renderer.prepareTransition(failed.data),/compile failed/);
  assert.equal(failed.renderer.unavailable,true);assert.equal(failed.renderer.points,null);assert.equal(failed.renderer.outgoing,null);
  const reduced=rendererFixture();reduced.renderer.reducedMotion=true;await reduced.renderer.prepareTransition(reduced.data);
  reduced.renderer.update(0);await reduced.renderer.whenSettled();assert.equal(reduced.renders.length,1);
  assert.equal(reduced.renderer.outgoing,null);reduced.renderer.startIntro();reduced.renderer.skipIntro();reduced.renderer.update(0);
  assert.equal(reduced.renders.length,2);reduced.renderer.dispose();
});
