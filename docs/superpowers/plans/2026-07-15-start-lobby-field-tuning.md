# StartLobby Field Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase the desktop StartLobby barrage density and scale while widening the dot deformation and applying a smooth non-linear black-hole attraction curve.

**Architecture:** Keep the existing Canvas2D runtime and pure glyph-physics boundary. Export only the visual/physics constants and attraction-speed resolver needed for deterministic tests; retain cached glyph sprites, 30 FPS scheduling, capped DPR, and desktop-only imports.

**Tech Stack:** React, TypeScript, Canvas2D, Node test runner, Vite, Playwright browser QA.

---

### Task 1: Lock density and attraction behavior with tests

**Files:**
- Modify: `apps/web/tests/lobby/start-lobby-glyph-physics.test.mjs`
- Modify: `apps/web/src/lobby/startLobbyGlyphPhysics.ts`

- [ ] **Step 1: Write failing tests for 50 streams and accelerating attraction**

Update the stream assertion to expect 50 and add a real curve test:

```js
import { resolveLobbyAttractionSpeed } from "../../src/lobby/startLobbyGlyphPhysics.ts";

assert.equal(START_LOBBY_STREAM_COUNT, 50);
const outer = resolveLobbyAttractionSpeed(0.1);
const middle = resolveLobbyAttractionSpeed(0.5);
const inner = resolveLobbyAttractionSpeed(0.9);
assert.ok(outer >= 25);
assert.ok(outer < middle && middle < inner);
assert.ok(inner - middle > middle - outer);
assert.ok(resolveLobbyAttractionSpeed(0) <= 30);
assert.ok(resolveLobbyAttractionSpeed(1) >= 595);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test apps/web/tests/lobby/start-lobby-glyph-physics.test.mjs`

Expected: FAIL because the stream constant is still 36 and `resolveLobbyAttractionSpeed` is not exported.

- [ ] **Step 3: Implement the minimal smooth cubic curve**

Use these constants and resolver:

```ts
export const START_LOBBY_STREAM_COUNT = 50;
export const START_LOBBY_POINTER_RADIUS_PX = 175;

export function resolveLobbyAttractionSpeed(influence: number) {
  const clamped = Math.max(0, Math.min(1, influence));
  const smooth = clamped * clamped * (3 - 2 * clamped);
  return 25 + 575 * smooth * smooth;
}
```

Replace the inline radial-speed expression in `advanceLobbyGlyph` with `resolveLobbyAttractionSpeed(influence)`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test apps/web/tests/lobby/start-lobby-glyph-physics.test.mjs`

Expected: all lobby glyph-physics tests pass.

### Task 2: Tune Canvas2D scale and dot field, then verify visually

**Files:**
- Modify: `apps/web/src/lobby/StartLobbyBarrage.tsx`
- Modify: `apps/web/tests/lobby/start-lobby.contract-test.mjs`

- [ ] **Step 1: Write a failing source contract for visual constants**

Add source assertions for the approved values:

```js
assert.match(source, /START_LOBBY_FONT_SCALE\s*=\s*1\.25/);
assert.match(source, /POINTER_DOT_FIELD_RADIUS_PX\s*=\s*300/);
assert.match(source, /POINTER_DOT_MAX_PULL_PX\s*=\s*30/);
assert.match(source, /POINTER_DOT_MAX_RADIUS_PX\s*=\s*3\s*;/);
```

- [ ] **Step 2: Run the contract and verify RED**

Run: `node apps/web/tests/lobby/start-lobby.contract-test.mjs`

Expected: FAIL because the approved constants do not exist yet.

- [ ] **Step 3: Apply the approved Canvas2D values**

Define:

```ts
const START_LOBBY_FONT_SCALE = 1.25;
const POINTER_DOT_FIELD_RADIUS_PX = 300;
const POINTER_DOT_MAX_PULL_PX = 30;
const POINTER_DOT_MAX_RADIUS_PX = 3;
```

Multiply both title/subtitle base sizes and random ranges by `START_LOBBY_FONT_SCALE`. Use the exported 175 px glyph radius separately from the 300 px dot radius. Calculate dot displacement with smoothstep influence and calculate radius from `0.58` to `3`, preserving a radial, non-spiral field.

- [ ] **Step 4: Run focused tests and full project gates**

Run:

```powershell
node --test apps/web/tests/lobby/start-lobby-glyph-physics.test.mjs
node apps/web/tests/lobby/start-lobby.contract-test.mjs
npm run verify:quick
npm run build:chunks
```

Expected: all commands exit 0.

- [ ] **Step 5: Perform browser QA and capture evidence**

At 1440×900, verify `data-stream-count="50"`, inspect the larger type, move the pointer through the field, and capture a screenshot with the pointer offset from the title so the roughly 300 px deformation, 30 px pull, 3 px dots, and non-linear glyph attraction remain visible. Confirm no new console errors and that Enter still transitions.

- [ ] **Step 6: Commit the atomic implementation**

```powershell
git add -- apps/web/src/lobby/startLobbyGlyphPhysics.ts apps/web/src/lobby/StartLobbyBarrage.tsx apps/web/tests/lobby/start-lobby-glyph-physics.test.mjs apps/web/tests/lobby/start-lobby.contract-test.mjs docs/superpowers/plans/2026-07-15-start-lobby-field-tuning.md
git commit -m "feat: intensify lobby black hole field"
```
