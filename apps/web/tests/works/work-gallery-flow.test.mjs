import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import {
  WORK_GALLERY_FLOW_SPEED_PX_S,
  resolveGalleryCopyCount,
  wrapGalleryScrollLeft,
} from "../../src/pages/works/workGalleryFlow.ts";
import * as flow from "../../src/pages/works/workGalleryFlow.ts";

test("release velocity converges continuously in either direction with frame-independent travel", () => {
  assert.equal(typeof flow.advanceGalleryMotion, "function");
  for (const initial of [-1200, 0, 1600]) {
    let velocity = initial, position = 0;
    for (let i = 0; i < 120; i++) {
      const next = flow.advanceGalleryMotion(velocity, 1 / 60, 32);
      assert.ok(next.velocity >= Math.min(velocity, 32) && next.velocity <= Math.max(velocity, 32));
      velocity = next.velocity; position += next.distance;
    }
    const whole = flow.advanceGalleryMotion(initial, 2, 32);
    assert.ok(Math.abs(position - whole.distance) < 1e-8);
    assert.ok(Math.abs(velocity - whole.velocity) < 1e-8);
    assert.ok(Math.abs(flow.advanceGalleryMotion(initial, 12, 32).velocity - 32) < .001);
  }
});

test("wrapGalleryScrollLeft wraps both directions into [0, period)", () => {
  const period = 1000;
  assert.equal(wrapGalleryScrollLeft(0, period), 0);
  assert.equal(wrapGalleryScrollLeft(320, period), 320);
  assert.equal(wrapGalleryScrollLeft(1000, period), 0, "exact period wraps to origin");
  assert.equal(wrapGalleryScrollLeft(1030, period), 30, "forward overflow wraps by one period");
  assert.equal(wrapGalleryScrollLeft(-30, period), 970, "backward overflow wraps to the tail");
  assert.equal(wrapGalleryScrollLeft(2530, period), 530, "multi-period overflow wraps by modulo");
  assert.equal(wrapGalleryScrollLeft(-2530, period), 470, "negative multi-period wraps by modulo");
});

test("wrapGalleryScrollLeft passes values through when the period is unknown", () => {
  assert.equal(wrapGalleryScrollLeft(500, 0), 500);
  assert.equal(wrapGalleryScrollLeft(-5, 0), -5);
  assert.equal(wrapGalleryScrollLeft(500, -1), 500);
});

test("resolveGalleryCopyCount keeps the wrap landing spot scrollable", () => {
  // 不变量:maxScroll = copies * setWidth - clientWidth >= setWidth
  assert.equal(resolveGalleryCopyCount(1000, 0), 2, "unmeasured period falls back to two copies");
  assert.equal(resolveGalleryCopyCount(1200, 15000), 2, "a long set needs only two copies");
  assert.equal(resolveGalleryCopyCount(1000, 1000), 2, "set exactly one viewport wide still fits");
  assert.equal(resolveGalleryCopyCount(1010, 1000), 3, "just over one viewport wide needs a third copy");
  assert.equal(resolveGalleryCopyCount(2300, 1000), 4, "ultra-wide viewports scale copies accordingly");
  for (const [clientWidth, setWidth] of [[1700, 1772], [2560, 1772], [800, 1200]]) {
    const copies = resolveGalleryCopyCount(clientWidth, setWidth);
    assert.ok(
      copies * setWidth - clientWidth >= setWidth,
      `copies=${copies} must keep maxScroll >= setWidth for ${clientWidth}/${setWidth}`,
    );
  }
});

test("auto-flow speed stays slow, constant and inside the 24-40px/s budget", () => {
  assert.ok(WORK_GALLERY_FLOW_SPEED_PX_S >= 24);
  assert.ok(WORK_GALLERY_FLOW_SPEED_PX_S <= 40);
});

test("work gallery contract keeps semantic images and has no transport controls", () => {
  const page = readFileSync(new URL("../../src/pages/works/WorkDetailPage.tsx", import.meta.url), "utf8");
  assert.match(page, /paused: selectedImage !== null/);
  assert.match(page, /Array\.from\(\{ length: galleryCopies \}/);
  assert.match(page, /aria-hidden=\{copyIndex > 0 \|\| undefined\}/);
  assert.match(page, /tabIndex=\{copyIndex > 0 \? -1 : 0\}/);
  assert.doesNotMatch(page, /playingExhibitId|galleryPlaying|ark-wgallery__controls|useDragScroll/);
  const css = readFileSync(new URL("../../src/styles/scroll-pages.css", import.meta.url), "utf8");
  assert.match(css, /\.ark-wgallery__item img\s*\{[^}]*object-fit: cover/);
});

test("the actual gallery owner pauses, wraps reverse drags, resumes momentum and cancels every RAF", () => {
  const source = readFileSync(new URL("../../src/pages/works/useGalleryAutoFlow.ts", import.meta.url), "utf8");
  const parsed = ts.createSourceFile("flow.ts", source, ts.ScriptTarget.Latest, true);
  const fn = parsed.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === "useGalleryAutoFlow");
  const body = [fn.getText(parsed)];
  for (const [file,name] of [["pages/works/useDragScroll.ts","bindGalleryMotion"],["scroll/useGalleryEntrance.ts","observeGalleryVisibility"]]) {
    const part=ts.createSourceFile(file,readFileSync(new URL(`../../src/${file}`,import.meta.url),"utf8"),ts.ScriptTarget.Latest,true);
    body.push(part.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text===name).getText(part));
  }
  const js = ts.transpileModule(body.join("\n").replaceAll("export function", "function").replaceAll("import.meta.env.DEV", "false"), { compilerOptions: {target:ts.ScriptTarget.ES2022} }).outputText;
  const refs=[], effects=[], frames=new Map(), trackEvents=new Map(), globalEvents=new Map(), docEvents=new Map();
  let now=100, seq=0, keyboard=false, measure=1000, resize;
  const track={scrollLeft:0,scrollWidth:2200,clientWidth:900,dataset:{},firstElementChild:{},
    querySelector:()=>keyboard?{}:null,hasPointerCapture:()=>false,setPointerCapture(){},releasePointerCapture(){},
    addEventListener:(t,f)=>trackEvents.set(t,f),removeEventListener:t=>trackEvents.delete(t)};
  const document={hidden:false,addEventListener:(t,f)=>docEvents.set(t,f),removeEventListener:t=>docEvents.delete(t)};
  const hook=vm.runInNewContext(`${js}; useGalleryAutoFlow;`,{
    ...flow, measureGallerySetWidth:()=>measure, prefersReducedMotion:()=>false, document,
    useRef:initial=>{const ref={current:initial};refs.push(ref);return ref;},useState:initial=>[initial,()=>{}],
    useCallback:fn=>fn,useLayoutEffect:fn=>effects.push(fn),Date,Math,
    requestAnimationFrame:fn=>{frames.set(++seq,fn);return seq;},cancelAnimationFrame:id=>frames.delete(id),
    matchMedia:()=>({addEventListener(){},removeEventListener(){}}),
    ResizeObserver:class {constructor(fn){resize=fn;}observe(){}disconnect(){}},
    IntersectionObserver:class {observe(){}disconnect(){}},
    window:{addEventListener:(t,f)=>globalEvents.set(t,f),removeEventListener:t=>globalEvents.delete(t)},
  });
  const result=hook({itemCount:2,paused:false,identity:"tree"});
  assert.equal(result.galleryCopies,2);result.galleryRef(track);const cleanup=effects.map(fn=>fn());
  const step=()=>{now+=16;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));assert.ok(frames.size<=1,"only one RAF owns motion");};
  for(let i=0;i<60;i++)step();assert.ok(track.scrollLeft>20);
  refs[1].current=true;const frozen=track.scrollLeft;for(let i=0;i<10;i++)step();assert.equal(track.scrollLeft,frozen);
  refs[1].current=false;keyboard=true;step();assert.equal(track.scrollLeft,frozen);keyboard=false;
  track.scrollLeft=10;
  trackEvents.get("pointerdown")({pointerId:7,pointerType:"mouse",button:0,clientX:300,timeStamp:now});
  trackEvents.get("pointermove")({pointerId:7,clientX:500,timeStamp:now+100});
  assert.equal(track.scrollLeft,810,"reverse drag crosses the seam without clamping");
  globalEvents.get("pointerup")({pointerId:7,type:"pointerup",timeStamp:now+100});step();
  assert.ok(+track.dataset.flowVelocity<0,"release retains reverse velocity");
  for(let i=0;i<700;i++)step();assert.ok(Math.abs(+track.dataset.flowVelocity-32)<.01);
  const phase=track.scrollLeft/measure;measure=1200;resize();assert.ok(Math.abs(track.scrollLeft/measure-phase)<1e-8);
  document.hidden=true;docEvents.get("visibilitychange")();assert.equal(frames.size,0);
  document.hidden=false;docEvents.get("visibilitychange")();assert.equal(frames.size,1);
  cleanup.toReversed().forEach(fn=>fn?.());assert.equal(frames.size,0);assert.equal(trackEvents.size,0);assert.equal(globalEvents.size,0);assert.equal(docEvents.size,0);
});
