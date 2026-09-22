import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { readSourceFile } from "../helpers/projectPaths.mjs";
import { getScrollPagesCopy } from "../../src/content/scrollPagesCopy.ts";
import * as scramble from "../../src/pages/works/workEdgeNavScramble.ts";
import {
  WORK_EDGE_NAV_ARROW_ROWS,
  WORK_EDGE_NAV_CIPHER_CHARS,
  WORK_EDGE_NAV_DECRYPT_MS,
  WORK_EDGE_NAV_ENCRYPT_MS,
  WORK_EDGE_NAV_HINT_FIRST_MAX_MS,
  WORK_EDGE_NAV_HINT_FIRST_MIN_MS,
  WORK_EDGE_NAV_HINT_MAX_GAP_MS,
  WORK_EDGE_NAV_HINT_MAX_VISIBLE_MS,
  WORK_EDGE_NAV_HINT_MIN_GAP_MS,
  WORK_EDGE_NAV_HINT_MIN_VISIBLE_MS,
  WORK_EDGE_NAV_IDLE_TICK_MS,
  WORK_EDGE_NAV_SCRAMBLE_TICK_MS,
  createHintClock,
  pickCipherChar,
  resolveArrowGrid,
  resolveHintCellChars,
  resolveRevealCount,
  resolveRevealOrder,
  scrambleText,
  stepHintClock,
} from "../../src/pages/works/workEdgeNavScramble.ts";

function mountIdleEdge(word, { reducedMotion = false } = {}) {
  const parsed = ts.createSourceFile("edge.tsx", readSourceFile("pages/works/WorkEdgeNav.tsx"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const fn = parsed.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === "AsciiEdgeLink");
  const js = ts.transpileModule(fn.getText(parsed).replace("export function", "function"), { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
  const refs = [], effects = [], frames = new Map(), events = new Map();
  let now = 100, sequence = 0;
  const document = {
    visibilityState: "visible",
    addEventListener: (type, handler) => events.set(type, handler),
    removeEventListener: (type) => events.delete(type),
  };
  const Component = vm.runInNewContext(`${js}; AsciiEdgeLink;`, {
    ...scramble, React, Link: "a", initialCipherChar: () => "#", prefersReducedMotion: () => reducedMotion,
    useMemo: (callback) => callback(), useState: (value) => [value, () => {}],
    useRef: (initial) => { const ref = { current: initial }; refs.push(ref); return ref; },
    useEffect: (callback) => effects.push(callback), performance: { now: () => now }, document,
    requestAnimationFrame: (callback) => { frames.set(++sequence, callback); return sequence; },
    cancelAnimationFrame: (id) => frames.delete(id),
  });
  Component({ side: "right", target: { href: "/devstories", title: word, hint: word } });
  refs[0].current = { matches: () => false, addEventListener() {}, removeEventListener() {} };
  refs[1].current = resolveArrowGrid("right").cells.map(() => ({ textContent: "", style: {}, dataset: {} }));
  refs[2].current = Array.from(word, () => ({ textContent: "", style: {}, dataset: {} }));
  const cleanup = effects[0]();
  return {
    frames, cleanup,
    hint: () => refs[1].current.filter((cell) => cell.dataset.hint).map((cell) => cell.textContent).join(""),
    advance(milliseconds) {
      for (let elapsed = 0; elapsed < milliseconds; elapsed += 100) {
        now += 100;
        const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback(now));
      }
    },
    setVisibility(value) { document.visibilityState = value; events.get("visibilitychange")(); },
  };
}

test("archive destinations use exact current-language labels for the shared arrow hints", () => {
  assert.equal(getScrollPagesCopy("zh").switchToDevStories, "开发日志");
  assert.equal(getScrollPagesCopy("zh").switchToProfile, "个人简介");
  assert.equal(getScrollPagesCopy("en").switchToDevStories, "DEV STORIES");
  assert.equal(getScrollPagesCopy("en").switchToProfile, "PROFILE");
});

for (const word of ["开发日志", "个人简介", "DEV STORIES", "PROFILE"]) {
  test(`idle edge repeatedly flashes the complete destination ${word}`, () => {
    const edge = mountIdleEdge(word);
    const flashes = [];
    let previous = "";
    for (let elapsed = 0; elapsed < 20_000; elapsed += 100) {
      edge.advance(100);
      const current = edge.hint();
      if (current && current !== previous) flashes.push(current);
      previous = current;
    }
    assert.ok(flashes.length >= 2, "idle animation must continue beyond the first frame");
    assert.ok(flashes.every((text) => text === word), "hint must preserve every character including internal spaces");
    edge.setVisibility("hidden");
    assert.equal(edge.frames.size, 0, "hidden tabs stop rendering");
    edge.setVisibility("visible");
    edge.advance(100);
    assert.equal(edge.frames.size, 1, "visible tabs resume the idle loop");
    edge.cleanup();
    assert.equal(edge.frames.size, 0, "unmount releases the loop");
  });
}

test("reduced-motion idle edges remain static", () => {
  const edge = mountIdleEdge("DEV STORIES", { reducedMotion: true });
  edge.advance(10_000);
  assert.equal(edge.hint(), "");
  assert.equal(edge.frames.size, 0);
  edge.cleanup();
});

test("shared edge links reveal for retained keyboard focus and do not hide on pointer leave", () => {
  const parsed=ts.createSourceFile("edge.tsx",readSourceFile("pages/works/WorkEdgeNav.tsx"),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const fn=parsed.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==="AsciiEdgeLink");
  const js=ts.transpileModule(fn.getText(parsed).replace("export function","function"),{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React}}).outputText;
  const refs=[],effects=[],events=new Map(),frames=new Map();let phase="idle",now=100,seq=0;
  const link={matches:selector=>selector.includes("focus-visible"),addEventListener:(t,f)=>events.set(t,f),removeEventListener:t=>events.delete(t)};
  const Component=vm.runInNewContext(`${js}; AsciiEdgeLink;`,{
    ...scramble,React,Link:"a",initialCipherChar:()=>"#",prefersReducedMotion:()=>false,
    useMemo:fn=>fn(),useState:initial=>[initial,value=>phase=value],useRef:initial=>{const r={current:initial};refs.push(r);return r;},useEffect:fn=>effects.push(fn),
    performance:{now:()=>now},requestAnimationFrame:fn=>{frames.set(++seq,fn);return seq;},cancelAnimationFrame:id=>frames.delete(id),
    document:{visibilityState:"visible",addEventListener(){},removeEventListener(){}},
  });
  Component({side:"right",target:{href:"/devstories",title:"Dev Stories"}});refs[0].current=link;
  refs[1].current=Array.from({length:31},()=>({textContent:"",style:{},dataset:{}}));
  refs[2].current=Array.from({length:11},()=>({textContent:"",style:{},dataset:{}}));
  const cleanup=effects[0]();
  for(let i=0;i<50;i++){now+=20;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));}
  assert.equal(phase,"revealed","new route retains focus, so its destination should reveal");
  events.get("pointerleave")();assert.equal(phase,"revealed");
  cleanup();assert.equal(frames.size,0);assert.equal(events.size,0);
});

test("the cipher arrow bitmap is a 7-row arrowhead with a shaft", () => {
  assert.equal(WORK_EDGE_NAV_ARROW_ROWS.length, 7);
  for (const row of WORK_EDGE_NAV_ARROW_ROWS) {
    assert.equal(row.length, 11, "each arrow row is 11 columns wide");
    assert.match(row, /^[.#]+$/);
  }
  // 中间行必须贯通成箭杆
  assert.equal(WORK_EDGE_NAV_ARROW_ROWS[3], "###########");
  // 上下镜像对称,箭头尖角在中间行最左列(左向;右向由 resolveArrowGrid 水平镜像)
  for (let row = 0; row < 3; row += 1) {
    assert.equal(
      WORK_EDGE_NAV_ARROW_ROWS[row],
      WORK_EDGE_NAV_ARROW_ROWS[6 - row],
      "arrowhead must be vertically symmetric around the shaft row",
    );
  }
  assert.equal(WORK_EDGE_NAV_ARROW_ROWS[3][0], "#", "arrow tip sits at the middle row, left edge");
  assert.equal(WORK_EDGE_NAV_ARROW_ROWS[0][0], ".", "top row must not touch the tip column");
});

test("arrow grids mirror horizontally between sides and expose cells in reading order", () => {
  const left = resolveArrowGrid("left");
  const right = resolveArrowGrid("right");

  assert.deepEqual(
    right.rows,
    left.rows.map((row) => Array.from(row).reverse().join("")),
    "the right-edge arrow is the horizontal mirror of the left one",
  );
  assert.equal(left.cells.length, right.cells.length);
  assert.ok(left.cells.length > 0);
  for (let index = 1; index < left.cells.length; index += 1) {
    const previous = left.cells[index - 1];
    const current = left.cells[index];
    assert.ok(
      current.row > previous.row ||
        (current.row === previous.row && current.column > previous.column),
      "cells must be listed in row-major reading order",
    );
  }
  for (const cell of left.cells) {
    assert.equal(left.rows[cell.row][cell.column], "#");
  }
});

test("reveal order starts from the pointer side and ends at the screen edge", () => {
  assert.deepEqual(resolveRevealOrder(4, "left"), [3, 2, 1, 0]);
  assert.deepEqual(resolveRevealOrder(4, "right"), [0, 1, 2, 3]);
  assert.deepEqual(resolveRevealOrder(0, "left"), []);
  assert.deepEqual(resolveRevealOrder(-3, "right"), []);
});

test("reveal count climbs monotonically and lands exactly on the title length", () => {
  const length = 17;
  assert.equal(resolveRevealCount(0, length, WORK_EDGE_NAV_DECRYPT_MS), 0);

  let previous = 0;
  for (let elapsed = 0; elapsed <= WORK_EDGE_NAV_DECRYPT_MS; elapsed += 13) {
    const count = resolveRevealCount(elapsed, length, WORK_EDGE_NAV_DECRYPT_MS);
    assert.ok(count >= previous, "reveal count must be monotonic");
    assert.ok(count >= 0 && count <= length);
    previous = count;
  }
  assert.equal(resolveRevealCount(WORK_EDGE_NAV_DECRYPT_MS, length, WORK_EDGE_NAV_DECRYPT_MS), length);
  assert.equal(resolveRevealCount(WORK_EDGE_NAV_DECRYPT_MS * 3, length, WORK_EDGE_NAV_DECRYPT_MS), length);
  assert.equal(resolveRevealCount(120, 0, WORK_EDGE_NAV_DECRYPT_MS), 0);
});

test("scramble keeps revealed characters and spaces, ciphering the rest", () => {
  const text = "ARK LIGHT 01";
  let tick = 0;
  const random = () => {
    tick += 1;
    return (tick * 0.37) % 1;
  };

  const none = scrambleText(text, new Set(), random);
  assert.equal(none.length, text.length);
  Array.from(text).forEach((char, index) => {
    if (char === " ") assert.equal(none[index], " ", "spaces must stay spaces");
    else {
      assert.ok(
        WORK_EDGE_NAV_CIPHER_CHARS.includes(none[index]),
        `unrevealed char ${index} must come from the cipher charset, got ${none[index]}`,
      );
    }
  });

  const all = new Set(Array.from(text, (_, index) => index));
  assert.equal(scrambleText(text, all, random), text, "fully revealed text is the real title");

  const partial = scrambleText(text, new Set([0, 5]), random);
  assert.equal(partial[0], "A");
  assert.equal(partial[5], "I");
});

test("cipher picks stay inside the charset and respect the injected random source", () => {
  assert.equal(
    pickCipherChar(() => 0),
    WORK_EDGE_NAV_CIPHER_CHARS[0],
  );
  assert.equal(
    pickCipherChar(() => 0.999),
    WORK_EDGE_NAV_CIPHER_CHARS[WORK_EDGE_NAV_CIPHER_CHARS.length - 1],
  );
  for (let index = 0; index < 50; index += 1) {
    assert.ok(WORK_EDGE_NAV_CIPHER_CHARS.includes(pickCipherChar()));
  }
});

test("flicker cadence stays low-frequency and the decrypt window stays snappy", () => {
  assert.ok(WORK_EDGE_NAV_IDLE_TICK_MS >= 1000 / 15, "idle flicker must not exceed 15fps");
  assert.ok(WORK_EDGE_NAV_SCRAMBLE_TICK_MS >= 1000 / 60 - 1e-9);
  assert.ok(WORK_EDGE_NAV_SCRAMBLE_TICK_MS >= WORK_EDGE_NAV_IDLE_TICK_MS / 3);
  assert.ok(WORK_EDGE_NAV_DECRYPT_MS >= 400 && WORK_EDGE_NAV_DECRYPT_MS <= 600);
  assert.ok(WORK_EDGE_NAV_ENCRYPT_MS < WORK_EDGE_NAV_DECRYPT_MS);
});

/* ---- idle 显词("上一件/下一件" = PREV/NEXT)---- */

/** 确定性随机源(mulberry32):给定 seed 复现显词调度。 */
function mulberry32(seed) {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("hint placements center the word on the arrow shaft row in reading order", () => {
  const left = resolveArrowGrid("left");
  const placements = resolveHintCellChars(left, "NEXT");
  assert.deepEqual([...placements.values()], ["N", "E", "X", "T"], "hint chars must be the word itself");
  const shaftCells = left.cells
    .map((cell, index) => ({ ...cell, index }))
    .filter((cell) => cell.row === 3);
  assert.equal(shaftCells.length, 11, "the shaft row runs edge to edge");
  // 4 字符词居中落在第 3-6 列(0 基)
  assert.deepEqual([...placements.keys()].map((cell) => left.cells[cell].column), [3, 4, 5, 6]);
  assert.ok([...placements.keys()].every((cell) => left.cells[cell].row === 3));

  // 右缘镜像网格:中文三字词同样居中,阅读序不变
  const right = resolveArrowGrid("right");
  const zhPlacements = resolveHintCellChars(right, "上一件");
  assert.deepEqual([...zhPlacements.values()], ["上", "一", "件"]);
  assert.deepEqual([...zhPlacements.keys()].map((cell) => right.cells[cell].column), [4, 5, 6]);

  // 长词按箭杆格数截断;空词/纯空格不落位
  assert.equal(resolveHintCellChars(left, "ABCDEFGHIJKLMNO").size, 11);
  assert.equal(resolveHintCellChars(left, "").size, 0);
  assert.equal(resolveHintCellChars(left, "   ").size, 0);
});

test("hint clock flashes at a restrained cadence with 0.5-1s dwell", () => {
  const random = mulberry32(20260905);
  let clock = createHintClock(0, random);
  assert.equal(clock.visible, false, "clock starts hidden");
  assert.ok(
    clock.untilMs >= WORK_EDGE_NAV_HINT_FIRST_MIN_MS && clock.untilMs <= WORK_EDGE_NAV_HINT_FIRST_MAX_MS,
    `first flash lands in the early window, got ${clock.untilMs}ms`,
  );

  // 模拟 300s、50ms 步进的 idle 时间线
  let flashes = 0;
  let visibleSteps = 0;
  let previousVisible = false;
  let dwellStartMs = 0;
  let lastFlashEndMs = -Infinity;
  for (let nowMs = 0; nowMs <= 300_000; nowMs += 50) {
    clock = stepHintClock(clock, nowMs, random);
    if (clock.visible && !previousVisible) {
      flashes += 1;
      dwellStartMs = nowMs;
      assert.ok(
        nowMs - lastFlashEndMs >= WORK_EDGE_NAV_HINT_MIN_GAP_MS - 50,
        "flashes must stay seconds apart",
      );
    }
    if (!clock.visible && previousVisible) {
      const dwell = nowMs - dwellStartMs;
      assert.ok(
        dwell >= WORK_EDGE_NAV_HINT_MIN_VISIBLE_MS - 50 && dwell <= WORK_EDGE_NAV_HINT_MAX_VISIBLE_MS + 50,
        `dwell must stay ~0.5-1s, got ${dwell}ms`,
      );
      lastFlashEndMs = nowMs;
    }
    if (clock.visible) visibleSteps += 1;
    previousVisible = clock.visible;
  }

  assert.ok(flashes >= 20 && flashes <= 90, `restrained cadence over 300s, got ${flashes} flashes`);
  const duty = visibleSteps / (300_000 / 50 + 1);
  assert.ok(duty > 0.04 && duty < 0.25, `hint must stay occasional, duty cycle ${(duty * 100).toFixed(1)}%`);
  assert.ok(
    WORK_EDGE_NAV_HINT_MAX_GAP_MS <= 10_000,
    "gap ceiling keeps the hint discoverable within a few seconds",
  );
});

test("during visible windows the hint cells equal the target word, seeded and reproducible", () => {
  const grid = resolveArrowGrid("left");
  const word = "PREV";
  const hintCellChars = resolveHintCellChars(grid, word);

  // 同一 seed 两次模拟的显词时间线必须完全一致(纯函数 + 注入随机源)
  const timeline = (seed) => {
    const random = mulberry32(seed);
    let clock = createHintClock(0, random);
    const visibility = [];
    for (let nowMs = 0; nowMs <= 60_000; nowMs += 50) {
      clock = stepHintClock(clock, nowMs, random);
      visibility.push(clock.visible);
    }
    return visibility;
  };
  const first = timeline(42);
  assert.deepEqual(timeline(42), first, "same seed must reproduce the same hint schedule");
  assert.ok(first.includes(true), "a visible window must occur within the first minute");

  // 显词期间:落位格字符与目标词一致,未落位格不被显词映射触碰
  const visibleRun = first.findIndex((visible) => visible);
  assert.ok(visibleRun >= 0);
  assert.equal(hintCellChars.size, Array.from(word).length);
  [...hintCellChars.entries()].forEach(([cell, char], index) => {
    assert.equal(char, Array.from(word)[index], `hint cell ${cell} must show word char ${index}`);
    assert.equal(grid.cells[cell].row, 3, "hint cells live on the shaft row");
  });
});
