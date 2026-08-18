# Corridor Opening Redesign Design

## Goal

Preserve the existing desktop StartLobby, animated barrage, Enter gesture, renderer disposal, and white handoff while replacing the corridor tutorial with a restrained `move → look → complete` guide and making jumping available on the first Space press.

## Preserved Boundaries

- Keep `apps/web/src/lobby/*`, `apps/web/src/pages/SpacePage.tsx`, the StartLobby content chunk, and the DesktopApp handoff flow.
- Keep Pointer Lock return coordination, WebGPU-to-WebGL2 fallback, the 4096 shadow decision, minimap, real exhibit Focus, projector behavior, and all unrelated exploration tasks.
- Do not modify or export GLB, Blender, Rhino, or E-drive source assets.

## Corridor Guide

The corridor continues to use the authored spawn and forward-facing camera composition. The guide contains two world-space live-text signs:

1. `move`: show `W A S D` keycaps and the existing bilingual movement copy. Measure forward progress from the camera position captured when this step begins and advance after 1.4 metres.
2. `look`: show only the bilingual mouse-look copy. Capture the camera quaternion when this step begins and advance after 7 degrees of angular change, without a raycast target or click.
3. `complete`: fade the look sign, notify the existing completion gate, and show no final sign.

Both signs remain mounted while the guide is active and use CSS opacity/transform transitions. The previous notice, demo exhibit, Focus demo, Escape, relock, done sign, raycast targets, queued sign lifecycle, and associated fallback timers are removed. Session and daily pose restore continue to skip the guide, and `resetSpaceOnboarding` remains available for replay.

## Jump and Exploration State

The Space key immediately queues a jump when controls are enabled; the existing grounded check remains the authority for whether the jump is applied. Jump height, gravity shaping, jump/landing audio, and landing state remain unchanged.

The five-attempt counter, jump-unlocked ref, jump notices, JumpHint HUD, and their CSS are removed. The `leave_the_floor` exploration task and `jump-unlocked` event are removed from selection, sensors, i18n, persistence fixtures, and contracts. Existing `spaceExplorationV1` validation naturally rejects a same-day record that contains the retired ID and redraws the four categories; no migration layer or storage-version change is added.

## Content Source

`docs/assets/space-exhibit-index.xlsx` remains the authority for generated UI copy. Remove the retired jump notice and onboarding rows, retain the move row, and change the look row to `Move the mouse to look` / `移动鼠标控制视角`. Regenerate checked-in content. StartLobby exhibit text generation remains unchanged.

## Verification

Use the repository-pinned Node 24.11.0 and npm 11.6.1. Run targeted onboarding, jump, quest/persistence, i18n, Pointer Lock, and StartLobby contracts before the full required commands. In real Chrome, capture the preserved StartLobby, click Enter through the white handoff, capture the corridor guide, move/look/press Space, confirm the first jump works and old tutorial surfaces do not appear, and record console warnings/errors.

## Approved Spawn Tuning Addendum

Keep the authored `spawn_player_main` node as the model authority, but resolve the gameplay spawn 11.3 metres forward along `GALLERY_INITIAL_LOOK_DIRECTION`. Re-raycast the floor at the offset X/Z position and retain the existing collision validator. Update the pre-GLB fallback from Z `-48.318` to `-37.018` so the initial and resolved spawn agree without editing the GLB.

Center both corridor prompts on the gameplay axis. Derive the move sign from the fallback spawn at roughly 3.2 metres ahead and the look sign at roughly 6.2 metres ahead; both use the spawn X coordinate instead of placing look on the left wall.
