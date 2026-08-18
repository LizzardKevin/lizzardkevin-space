# Corridor Opening Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve StartLobby and its white handoff while reducing the corridor guide to move/look and enabling jumping from the first Space press.

**Architecture:** Keep the existing persistent SPACE host and renderer boundaries. Replace the corridor's multi-surface onboarding with a two-step pure reducer plus a lightweight world-space component, remove jump notice plumbing, and let the existing exploration record validator reject retired `leave_the_floor` records without a migration.

**Tech Stack:** React 19, React Three Fiber, Three.js, Rapier, TypeScript, Node test runner, i18next, workbook-driven generated content.

---

### Task 1: Reduce the corridor state machine

**Files:**
- Modify: `apps/web/tests/space/onboarding-state.test.mjs`
- Modify: `apps/web/src/scenes/onboarding/spaceOnboardingConfig.ts`
- Modify: `apps/web/src/scenes/onboarding/spaceOnboardingState.ts`

- [ ] Replace the old eight-step expectations with a failing test that starts at `move`, ignores insufficient forward progress, advances at `SPACE_ONBOARDING_MOVE_DISTANCE_M`, ignores angular changes below `SPACE_ONBOARDING_LOOK_RADIANS`, and completes at the threshold.
- [ ] Run `node --test apps/web/tests/space/onboarding-state.test.mjs` and confirm it fails because the current initial step is `notice` and the reducer has no completing `lookChanged` transition.
- [ ] Reduce `SpaceOnboardingStepId` to `"move" | "look" | "complete"` and events to `moveProgress` and `lookChanged`; return `{ step: "complete", completed: true }` at the look threshold.
- [ ] Re-run the test and confirm it passes.

### Task 2: Replace the world-space tutorial surfaces

**Files:**
- Modify: `apps/web/tests/space/onboarding.contract-test.mjs`
- Modify: `apps/web/src/scenes/onboarding/SpaceOnboarding.tsx`
- Delete: `apps/web/src/scenes/onboarding/SpaceOnboardingFocusDemo.tsx`
- Delete: `apps/web/src/scenes/onboarding/spaceOnboardingSignVisibility.ts`
- Modify: `apps/web/src/styles/global.css`

- [ ] Change the contract first to require only `move` and `look`, quaternion-angle look detection, WASD keycaps, live bilingual text, and absence of notice/demo/focus/Escape/relock/done/raycast/queued-sign tokens.
- [ ] Run `node apps/web/tests/space/onboarding.contract-test.mjs` and confirm it fails against the old tutorial.
- [ ] Render the two configured signs for the whole active guide, use refs for per-frame start position/quaternion, dispatch `moveProgress` and `lookChanged`, and call `onCompleted` once after the short complete fade.
- [ ] Remove obsolete focus-demo and sign-queue CSS, leaving only the live sign/keycap and enter/exit transitions plus reduced-motion handling.
- [ ] Re-run onboarding unit and contract tests.

### Task 3: Make Space jump immediate

**Files:**
- Modify: `apps/web/tests/space/movement-debug.contract-test.mjs`
- Modify: `apps/web/tests/space/i18n-copy.contract-test.mjs`
- Modify: `apps/web/tests/space/interaction.contract-test.mjs`
- Modify: `apps/web/src/scenes/Player/PlayerController.tsx`
- Modify: `apps/web/src/scenes/SpaceScene.tsx`
- Modify: `apps/web/src/space/SpaceSession.tsx`
- Modify: `apps/web/src/pages/SpaceDesktopExperience.tsx`
- Modify: `apps/web/src/space/SpaceHud.tsx`
- Modify: `apps/web/src/styles/global.css`

- [ ] Update contracts to require a Space keydown to set `pendingJumpRef.current = true`, and to reject unlock counters, jump notice keys, callbacks, JumpHint markup, and `.jump-hint` CSS.
- [ ] Run the three contracts and confirm they fail on the current unlock chain.
- [ ] Remove `SpaceJumpNoticeKey`, attempt/unlock refs, notice callback plumbing, state/timers, HUD component/props, and CSS; retain the existing grounded physics application and audio calls.
- [ ] Re-run player motion, movement, i18n, interaction, audio, and landing tests.

### Task 4: Remove the retired exploration task

**Files:**
- Modify: `apps/web/tests/space/space-quest-selection.test.mjs`
- Modify: `apps/web/tests/space/space-quest-sensors.test.mjs`
- Modify: `apps/web/tests/space/space-quests.test.mjs`
- Modify: `apps/web/tests/space/space-hud-widgets.contract-test.mjs`
- Modify: `apps/web/src/space/quests/spaceQuestSelection.ts`
- Modify: `apps/web/src/space/quests/spaceQuestSensors.ts`
- Modify: `apps/web/src/i18n/i18n.ts`

- [ ] Update tests to expect a nine-task pool, no `leave_the_floor` ID/event/sensor/copy, and rejection of a current-day legacy record containing the retired ID.
- [ ] Run the quest tests/contracts and confirm they fail while the task remains.
- [ ] Remove the task ID/definition, event union member, sensor case, desktop dispatch, and runtime copy; rely on existing pool validation for legacy invalidation.
- [ ] Re-run all quest tests and the HUD widget contract.

### Task 5: Update workbook-driven copy and integration contracts

**Files:**
- Modify: `docs/assets/space-exhibit-index.xlsx`
- Modify: `apps/web/src/generated/i18nResources.generated.ts`
- Modify: `apps/web/src/generated/exhibitLabels.generated.ts`
- Modify: `scripts/generate-space-content.mjs`
- Modify: `apps/web/src/content/lightweightExhibitIndex.ts`
- Modify: `apps/web/tests/exhibits/workbook-pipeline.contract-test.mjs`
- Modify: `apps/web/tests/space/onboarding.contract-test.mjs`
- Modify: `apps/web/tests/space/i18n-copy.contract-test.mjs`

- [ ] Make the generated-content contracts fail by rejecting retired jump/onboarding keys and the synthetic onboarding exhibit label while requiring the simplified look copy.
- [ ] Remove the retired workbook `ui_copy` rows, update the look values, remove the synthetic guide label emission/exclusion, and run `npm run content:generate`.
- [ ] Run `npm run content:check`, workbook contracts, onboarding contracts, and i18n contracts.

### Task 6: Preserve StartLobby and verify release gates

**Files:**
- Modify only if required by removed prop types: app/space contract tests that import the changed files.
- Do not modify: `apps/web/src/lobby/*`, `apps/web/src/pages/SpacePage.tsx`, StartLobby generated text, or DesktopApp handoff behavior.

- [ ] Run all StartLobby tests plus Pointer Lock, persistent host, lifecycle, runtime boundary, and chunk contracts; confirm the lobby renderer disposal and white handoff remain asserted.
- [ ] Run `npm run verify:quick`, `npm run build:chunks`, `npm run build:github-pages:chunks`, and `git diff --check`.
- [ ] In real Chrome with cleared SPACE storage, capture StartLobby and the corridor guide, exercise Enter → handoff → move → look → first-press jump, and record console warnings/errors.
- [ ] Review `git diff --stat`, confirm no GLB/source-asset changes, then create one commit for the complete redesign. Do not merge or push.

### Task 7: Move the gameplay spawn to the corridor midpoint

**Files:**
- Modify: `apps/web/tests/space/spawn-grounding.test.mjs`
- Modify: `apps/web/tests/space/onboarding-state.test.mjs`
- Modify: `apps/web/src/scenes/gallery/galleryConfig.ts`
- Modify: `apps/web/src/scenes/gallery/resolveGallerySpawn.ts`
- Modify: `apps/web/src/scenes/onboarding/spaceOnboardingConfig.ts`

- [ ] Update the grounding test to require `resolveGallerySpawn` to return the model marker plus an 11.3 metre forward offset and to raycast the floor below that offset point; require the pre-GLB fallback Z to equal `-37.018`.
- [ ] Update the onboarding config test to require both signs to share the spawn X coordinate, with move 3.2 metres and look 6.2 metres ahead of the fallback spawn.
- [ ] Run both tests and confirm they fail against the current marker position and left-offset look sign.
- [ ] Add `GALLERY_SPAWN_FORWARD_OFFSET_M = 11.3`, update the fallback spawn, and apply the offset before floor grounding and collision validation in `resolveGallerySpawn`.
- [ ] Derive both sign positions from `GALLERY_SPAWN`, then run targeted spawn/onboarding tests, full release verification, both chunk builds, and real Chrome visual QA.
- [ ] Amend the existing feature commit so the branch retains one commit. Do not merge or push.
