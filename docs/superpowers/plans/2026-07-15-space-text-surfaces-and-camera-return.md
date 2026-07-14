# SPACE Text Surfaces And Camera Return Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace boxed lightweight text surfaces with depth-aware text and make every SPACE return restore working camera rotation.

**Architecture:** Keep the existing DOM/R3F split and persistent Canvas. Apply visual changes through existing CSS and text geometry inputs, then make guarded pointer controls lifecycle-stable by keeping listeners mounted and gating their handlers through a current enabled ref.

**Tech Stack:** React 19, TypeScript, React Three Fiber, Three.js, native CSS, Node test runner, standalone Playwright CLI.

---

## File Structure

- Modify `apps/web/src/lobby/StartLobby.tsx`: halve the upper Three title.
- Modify `apps/web/src/lobby/startLobby.css`: make Enter a text-only 3D control.
- Modify `apps/web/src/components/Toast.tsx`: move the generic notice to a class-based text-only style.
- Modify `apps/web/src/styles/global.css`: define the shared glowing-glyph treatment for transient HUD notices.
- Modify `apps/web/src/scenes/SpaceScene.tsx`: keep guarded pointer controls mounted and pass `enabled` explicitly.
- Modify `apps/web/src/scenes/controls/GuardedPointerLockControls.tsx`: keep listeners stable and gate work with an enabled ref.
- Modify `apps/web/src/space/spacePointerLockTarget.ts`: recognize the unique SPACE canvas across browser element wrappers.
- Modify the existing lobby, interaction, movement, and pointer-lock contract tests.
- Keep browser scripts and screenshots outside the repository in the thread visualization directory.

### Task 1: Text-Only StartLobby And HUD Notices

**Files:**
- Modify: `apps/web/src/lobby/StartLobby.tsx`
- Modify: `apps/web/src/lobby/startLobby.css`
- Modify: `apps/web/src/components/Toast.tsx`
- Modify: `apps/web/src/styles/global.css`
- Test: `apps/web/tests/lobby/start-lobby.contract-test.mjs`
- Test: `apps/web/tests/space/interaction.contract-test.mjs`

- [x] **Step 1: Write failing visual contracts**

Require the exact upper title size and text-only surface declarations:

```js
assert.match(source, /<LobbyWord text="LIZZARDKEVIN" size=\{0\.38\}/);
assert.match(source, /<LobbyWord text="SPACE" size=\{1\.24\}/);
assert.equal(declarationValue(enterRule, "border"), "0");
assert.equal(declarationValue(enterRule, "background"), "transparent");
assert.equal(declarationValue(jumpRule, "border"), "0");
assert.equal(declarationValue(jumpRule, "background"), "transparent");
assert.match(declarationValue(jumpRule, "text-shadow"), /0 0/);
```

- [x] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
node --test apps/web/tests/lobby/start-lobby.contract-test.mjs
node apps/web/tests/space/interaction.contract-test.mjs
```

Expected: fail because the title is still `0.76` and Enter/jump/projector/Toast still own boxed surfaces.

- [x] **Step 3: Implement the minimal visual change**

Use size `0.38` for `LIZZARDKEVIN`. Keep the Enter button native but set `border: 0`, `background: transparent`, remove its minimum width, and use layered text shadows plus transform-only hover/active feedback. Replace Toast inline styles with `className="space-toast"`. Apply the same transparent, borderless, glyph-stroke and text-shadow treatment to `.jump-hint`, `.projector-controls-hint`, and `.space-toast`.

- [x] **Step 4: Run focused tests and verify GREEN**

Run the two commands from Step 2 plus TypeScript and lint. Expected: all pass without warnings.

- [x] **Step 5: Capture StartLobby and in-SPACE hint screenshots**

Capture 1440x900 normal, hover, keyboard focus, reduced-motion, jump hint, and Toast states. Confirm there is no rectangular outline or surface and text remains readable.

- [x] **Step 6: Commit the visual change**

```powershell
git add apps/web/src/lobby/StartLobby.tsx apps/web/src/lobby/startLobby.css apps/web/src/components/Toast.tsx apps/web/src/styles/global.css apps/web/tests/lobby/start-lobby.contract-test.mjs apps/web/tests/space/interaction.contract-test.mjs
git commit -m "style: unbox SPACE text surfaces"
```

### Task 2: Lifecycle-Stable Camera Controls

**Files:**
- Modify: `apps/web/src/scenes/SpaceScene.tsx`
- Modify: `apps/web/src/scenes/controls/GuardedPointerLockControls.tsx`
- Test: `apps/web/tests/space/canvas-pointer-lock.test.mjs`
- Test: `apps/web/tests/space/movement-debug.contract-test.mjs`

- [x] **Step 1: Write a failing stable-listener contract**

Require an always-mounted control and ref-gated handlers:

```js
assert.match(scene, /<GuardedPointerLockControls enabled=\{pointerControlsEnabled\} selector="#space-canvas"/);
assert.match(controls, /const enabledRef = useRef\(enabled\)/);
assert.match(controls, /enabledRef\.current = enabled/);
assert.match(controls, /if \(!enabledRef\.current\) return/);
assert.doesNotMatch(controls, /if \(!enabled\) return;[\s\S]*addEventListener\("mousemove"/);
```

- [x] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
node --test apps/web/tests/space/canvas-pointer-lock.test.mjs
node apps/web/tests/space/movement-debug.contract-test.mjs
```

Expected: fail because controls are conditionally mounted and mouse listeners are tied to `enabled` effect churn.

- [x] **Step 3: Implement stable listener ownership**

Render `GuardedPointerLockControls` unconditionally inside `SpaceScene`, pass `enabled={pointerControlsEnabled}`, store `enabled` in a ref updated by layout effect, and keep pointerlock/mousemove/click listeners mounted. Begin `onMouseMove` and `lock` with an enabled-ref guard. Accept either the same Canvas object or the unique `space-canvas` identity reported through a browser wrapper. Preserve warmup filtering, raw fallback, event compute restoration, camera math, and cleanup.

- [x] **Step 4: Run focused tests and verify GREEN**

Run pointer-lock, movement-debug, cursor, interaction, and route tests. Expected: all pass with one click owner and no duplicate requests.

- [x] **Step 5: Prove actual camera motion in production browser QA**

For Focus, Profile, and DevStories, verify after one return activation:

```js
document.pointerLockElement?.id === "space-canvas"
```

Then send more than the two warmup mouse movements, require non-dropped guarded samples in development, and compare before/after screenshots to confirm visible camera rotation. Also require the same marked Canvas node, no overlay, active render loop, and no relevant console/page errors.

- [x] **Step 6: Commit the interaction fix**

```powershell
git add apps/web/src/scenes/SpaceScene.tsx apps/web/src/scenes/controls/GuardedPointerLockControls.tsx apps/web/tests/space/canvas-pointer-lock.test.mjs apps/web/tests/space/movement-debug.contract-test.mjs
git commit -m "fix: keep SPACE camera controls ready on return"
```

### Task 3: Final Verification

**Files:**
- Modify only the plan completion evidence if all gates pass.

- [x] **Step 1: Run focused browser QA**

Exercise StartLobby visual states, all three return paths, keyboard activation, Escape, and reduced motion at 1440x900.

- [x] **Step 2: Run repository gates**

```powershell
npm run verify:quick
npm run build:chunks
```

- [x] **Step 3: Inspect scope**

Run `git diff --check`, confirm a clean worktree, and verify no asset, GLB, Blender, workbook, content, audio, texture, route, or mobile file changed.

## Self-Review

- Every approved requirement maps to a test and browser proof.
- Pointer lock and camera response are treated as separate acceptance signals.
- The stable listener adds no React state churn and only one dormant boolean check while disabled.
- Visual changes reuse existing type, palette, and glow language without new dependencies or assets.

## Completion Evidence

- Visual commit: `d7ead8b style: unbox SPACE text surfaces`.
- Camera commit: `2b14066 fix: keep SPACE camera controls active on return`.
- Standalone Playwright QA passed at 1440x900 for StartLobby focus and the jump notice; both computed as transparent, borderless, and text-shadowed.
- Profile, DevStories, and Focus each returned through one trusted activation, retained the marked Canvas, locked `space-canvas`, and produced non-dropped camera input samples.
- Profile before/after screenshots changed from yaw 180° / pitch 0° to yaw 152.84° / pitch -26.36°, proving rendered camera rotation.
- `npm run verify:quick` and `npm run build:chunks` passed on 2026-07-15.
- Scope inspection found no asset, GLB, Blender, workbook, content, audio, texture, route, or mobile changes.
