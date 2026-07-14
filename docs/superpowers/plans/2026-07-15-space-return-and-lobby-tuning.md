# SPACE Return And Lobby Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mute the desktop StartLobby field and make trusted returns from Focus, Profile, and DevStories restore first-person pointer lock without an extra click.

**Architecture:** Keep the temporary lobby and persistent SPACE runtime unchanged. The lobby change synchronizes one existing approved color across the Three background, fog, and CSS fallback. The interaction change adds an explicit DesktopApp-owned return handoff so the pointer-lock guard is removed synchronously for the original trusted activation while ordinary blocked routes remain protected.

**Tech Stack:** React 19, React Router, React Three Fiber, Three.js, TypeScript, Node test runner, Playwright CLI.

---

## File Structure

- Modify `apps/web/src/lobby/StartLobby.tsx`: set the Three background and fog to the approved muted field.
- Modify `apps/web/src/lobby/startLobby.css`: keep the pre-Canvas fallback identical to the Three field.
- Modify `apps/web/tests/lobby/start-lobby.contract-test.mjs`: enforce one shared field color and preserve the bright accent.
- Modify `apps/web/src/app/DesktopApp.tsx`: own the trusted return handoff and separate route-only completion from pointer-lock activation.
- Modify `apps/web/src/space/useSpacePointerLockGuard.ts`: synchronously remove the blocked-route listener when the handoff is armed.
- Modify `apps/web/tests/space/canvas-pointer-lock.test.mjs`: enforce request timing, guard policy, and one-request ownership.
- Save Playwright evidence outside the repository under the existing thread visualization directory.

### Task 1: Muted StartLobby Field

**Files:**
- Modify: `apps/web/src/lobby/StartLobby.tsx`
- Modify: `apps/web/src/lobby/startLobby.css`
- Test: `apps/web/tests/lobby/start-lobby.contract-test.mjs`

- [ ] **Step 1: Write the failing color contract**

Require `#69827e` for the Three background, fog, and `.start-lobby` CSS background, and require `#67c2be` to remain present as an accent.

- [ ] **Step 2: Prove the test fails**

Run: `node --test apps/web/tests/lobby/start-lobby.contract-test.mjs`

Expected: the muted field assertion fails against the current `#67c2be` background/fog/fallback.

- [ ] **Step 3: Apply the minimal palette change**

Change only the two `LobbyScene` field values and the CSS fallback:

```tsx
<color attach="background" args={["#69827e"]} />
<fog attach="fog" args={["#69827e", 8, 18]} />
```

```css
.start-lobby {
  background: #69827e;
}
```

- [ ] **Step 4: Prove the test passes**

Run the lobby contract and the lobby ownership/viewport/handoff tests. Expected: all pass.

- [ ] **Step 5: Capture visual states and commit**

Capture 1440x900 initial, pointer, focus-visible, reduced-motion, 1000x700 resize, and Enter handoff. Commit only the lobby sources and test as `fix: mute desktop StartLobby field`.

### Task 2: Trusted Pointer-Lock Return Handoff

**Files:**
- Modify: `apps/web/src/app/DesktopApp.tsx`
- Modify: `apps/web/src/space/useSpacePointerLockGuard.ts`
- Test: `apps/web/tests/space/canvas-pointer-lock.test.mjs`

- [ ] **Step 1: Write failing timing and guard contracts**

Require the normal Profile/DevStories return path to request pointer lock inside `beginOverlayClose`, require `onClosed` to perform route-only completion, and require Focus to remove the old route guard before requesting. Require the guard to use `useLayoutEffect` so `flushSync` cleanup is synchronous.

- [ ] **Step 2: Prove the tests fail**

Run: `node --test apps/web/tests/space/canvas-pointer-lock.test.mjs`

Expected: the current delayed `onClosed -> navigateToSpace -> requestPointerLock` implementation fails the timing assertions.

- [ ] **Step 3: Add the minimal handoff**

Add a DesktopApp boolean return handoff. Arm it via `flushSync` inside the initiating return callback, allow the guard only for that armed return, synchronously call the existing resume function, and make overlay `onClosed` navigate without requesting again. Clear the handoff when `/` becomes active. Convert the guard effect to `useLayoutEffect` without changing its release/listener behavior.

- [ ] **Step 4: Prove targeted tests pass**

Run pointer-lock, routing, lifecycle, cursor, and interaction contracts. Expected: all pass with exactly one pointer-lock owner/request per return.

- [ ] **Step 5: Production browser regression**

In a root-base production preview, test Focus, Profile, and DevStories return buttons. For each, assert the URL is `/`, the original Canvas node remains, and `document.pointerLockElement?.id` is `space-canvas` before another Canvas click. Also exercise Escape and pointer-lock failure fallback.

- [ ] **Step 6: Commit**

Commit only the return-handoff sources and test as `fix: restore pointer lock on SPACE returns`.

### Task 3: Final Verification

**Files:**
- Modify only if generated evidence is deliberately refreshed; protected assets remain unchanged.

- [ ] **Step 1: Run focused verification**

Run lobby, pointer-lock, route, lifecycle, cursor, interaction, TypeScript, and lint checks.

- [ ] **Step 2: Run production verification**

Run `npm run build:chunks`, the standalone Playwright QA, and `npm run verify:quick`.

- [ ] **Step 3: Inspect scope**

Run `git diff --check`, inspect both atomic commits, and confirm no protected asset, generated content, workbook, GLB, Blender, texture, or audio path changed.

- [ ] **Step 4: Independent review**

Request a requirements review followed by a code-quality review. Fix confirmed findings and rerun affected gates before reporting completion.

## Self-Review

- The plan covers both approved corrections and keeps them in separate commits.
- Pointer-lock timing is verified at the actual browser boundary rather than by build success alone.
- The plan introduces no asset, renderer-profile, mobile, or content-pipeline work.
- No placeholder or unresolved design decision remains.

