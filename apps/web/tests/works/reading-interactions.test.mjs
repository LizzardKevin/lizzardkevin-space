import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { readSourceFile } from "../helpers/projectPaths.mjs";
import { importSourceModule } from "../helpers/projectPaths.mjs";

test("scroll bus refreshes stale loading dimensions before restoring a ready work", async () => {
  const bus = await importSourceModule("scroll/scrollBus.ts");
  let limit=0, actual=0;
  bus.registerScrollBusLenis({
    resize(){limit=1500;},
    scrollTo(position){actual=Math.min(position,limit);},
  });
  try {
    bus.scrollBusJumpTo(917);
    assert.equal(actual,917,"the loading hero's cached zero limit must not clamp Back");
  } finally { bus.registerScrollBusLenis(null); }
});

function component(file, name) {
  const source = ts.createSourceFile(file, readSourceFile(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const node = source.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === name);
  return ts.transpileModule(node.getText(source).replace("export function", "function"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText + `; ${name};`;
}

test("a requested work preserves the last ready content while loading its replacement", () => {
  const previous = { status: "ready", exhibit: { exhibitId: "tree" }, content: { title: "Tree" }, works: [], index: 0 };
  const hook = vm.runInNewContext(component("pages/works/useWorkDetail.ts", "useWorkDetail"), {
    isKnownExhibitId: () => true, useEffect: () => {},
    useState: () => [{ key: "tree|en", value: previous }, () => {}],
  });
  const next = hook("uabb", "en");
  assert.equal(next.status, "ready", "a loading-only hero would unmount the live canvas");
  assert.equal(next.exhibit.exhibitId, "tree");
  assert.equal(next.pending, true);
  assert.equal(hook("tree", "zh").exhibit.exhibitId, "tree");
});

test("leaving a work clears its modal, while a language rerender keeps it", () => {
  const source=readSourceFile("pages/works/WorkDetailPage.tsx");
  const start=source.indexOf("  const [imageSelection,");
  const end=source.indexOf("  // 粒子宿主失败",start);
  const code=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const states=[];
  const render=id=>{
    let cursor=0;
    return vm.runInNewContext(`${code}; selectedImage;`,{exhibitId:id,useState:initial=>{
      const slot=cursor++;
      if(!(slot in states))states[slot]=initial;
      return [states[slot],value=>{states[slot]=value;}];
    }});
  };
  render('tree'); states[0]={exhibitId:'tree',src:'drawing.webp',alt:'Drawing'};
  assert.ok(render('tree'),"same work language change retains an open modal");
  assert.equal(render('uabb'),null);
  assert.equal(states[0],null);
  assert.equal(render('tree'),null,"Back must not reopen the departed modal");
});

test("work history resets new entries, restores Back, and leaves language rerenders in place", () => {
  const events = new Map(), ref = { current: null }, jumps = [];
  const scroller = { scrollTop: 0, addEventListener:(type, fn)=>events.set(type,fn), removeEventListener: type=>events.delete(type) };
  let location = { key:"tree" }, navigation = "PUSH", cleanup;
  const hook = vm.runInNewContext(component("scroll/useRouteScrollPosition.ts","useRouteScrollPosition"), {
    positions:new Map(), useRef:()=>ref, useLocation:()=>location, useNavigationType:()=>navigation,
    useLayoutEffect:fn=>{ cleanup?.(); cleanup=fn(); },
    scrollBusJumpTo:position=>{ jumps.push(position); scroller.scrollTop=position; },
  });
  hook(scroller,true);
  scroller.scrollTop=917; events.get("scroll")();
  location={key:"uabb"}; hook(scroller,false);
  assert.deepEqual(jumps,[0],"loading must not clamp a saved position");
  hook(scroller,true);
  assert.equal(scroller.scrollTop,0);
  scroller.scrollTop=400; events.get("scroll")();
  hook(scroller,true);
  assert.equal(scroller.scrollTop,400,"same history entry/language does not jump");
  location={key:"tree"}; navigation="POP"; hook(scroller,true);
  assert.equal(scroller.scrollTop,917);
  cleanup(); assert.equal(events.size,0);
});

test("lightbox isolates background, contains both Tab directions and restores trigger without scrolling", () => {
  const docEvents=new Map(), windowEvents=new Map();
  let active, timer, closed=0;
  class Element {
    constructor(parent=null) { this.parentElement=parent; this.children=[]; this.inert=false; this.isConnected=true; this.events=new Map(); parent?.children.push(this); }
    focus(options) { active=this; this.focusOptions=options; }
    contains(node) { return node===this || this.children.some(child=>child.contains(node)); }
    closest() { return this.inert ? this : this.parentElement?.closest() ?? null; }
    addEventListener(type,fn) { this.events.set(type,fn); }
    removeEventListener(type) { this.events.delete(type); }
  }
  const body=new Element(), background=new Element(body), branch=new Element(body), trigger=new Element(branch), root=new Element(branch), close=new Element(root);
  const preserved=new Element(body); preserved.inert=true;
  active=trigger;
  const refs=[], effects=[];
  const document={body,get activeElement(){return active;},addEventListener:(t,f)=>docEvents.set(t,f),removeEventListener:t=>docEvents.delete(t)};
  const render = vm.runInNewContext(component("scroll/ImageLightbox.tsx","ImageLightbox"), {
    React, HTMLElement:Element, Node:Element, document, CLOSE_MS:180,
    useState:value=>[value,()=>{}], usePageLanguage:()=>"en", useRef:value=>{const ref={current:value};refs.push(ref);return ref;},
    useEffect:fn=>effects.push(fn),useCallback:fn=>fn,prefersReducedMotion:()=>false,
    requestAnimationFrame:()=>1,cancelAnimationFrame(){},
    window:{setTimeout:fn=>{timer=fn;return 1;},clearTimeout(){timer=null;},addEventListener:(t,f)=>windowEvents.set(t,f),removeEventListener:t=>windowEvents.delete(t)},
  });
  render({src:"image.webp",alt:"Drawing",onClose:()=>closed++});
  refs[0].current=root; refs[1].current=close;
  const cleanups=effects.map(fn=>fn());
  assert.equal(active,close); assert.equal(background.inert,true); assert.equal(trigger.inert,true);
  for(const shiftKey of [false,true]) {
    let prevented=false;
    windowEvents.get("keydown")({key:"Tab",shiftKey,preventDefault(){prevented=true;},stopPropagation(){}});
    assert.equal(prevented,true); assert.equal(active,close);
  }
  let stopped=false;
  let defaultPrevented=false;
  root.events.get("wheel")({preventDefault(){defaultPrevented=true;},stopPropagation(){stopped=true;}});
  assert.equal(stopped,true); assert.equal(defaultPrevented,true);
  windowEvents.get("keydown")({key:"Escape",preventDefault(){},stopPropagation(){}});
  assert.equal(closed,0); timer(); assert.equal(closed,1);
  cleanups.reverse().forEach(fn=>fn?.());
  assert.equal(background.inert,false); assert.equal(trigger.inert,false); assert.equal(preserved.inert,true);
  assert.equal(active,trigger); assert.equal(trigger.focusOptions.preventScroll,true);
  assert.equal(docEvents.size,0); assert.equal(windowEvents.size,0); assert.equal(root.events.size,0);
});
