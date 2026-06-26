import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function readProjectFile(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
}

function readOptionalProjectFile(path) {
  try {
    return readProjectFile(path);
  } catch {
    return "";
  }
}

const files = {
  cursor: readProjectFile("apps/web/src/cursor/SpaceCursorOverlay.tsx"),
  cursorController: readProjectFile("apps/web/src/cursor/spaceCursorController.ts"),
  crosshair: readProjectFile("apps/web/src/components/Crosshair.tsx"),
  css: readProjectFile("apps/web/src/styles/global.css"),
  debugOverlay: readOptionalProjectFile("apps/web/src/scenes/debug/SpaceMovementDebugOverlay.tsx"),
  debugTelemetry: readOptionalProjectFile("apps/web/src/scenes/debug/spaceMovementDebug.ts"),
  guardedPointerLock: readProjectFile("apps/web/src/scenes/controls/guardedPointerLock.ts"),
  guardedPointerLockControls: readProjectFile("apps/web/src/scenes/controls/GuardedPointerLockControls.tsx"),
  hoverHighlight: readProjectFile("apps/web/src/exhibits/ExhibitHoverHighlight.tsx"),
  exhibitRaycast: readProjectFile("apps/web/src/scenes/exhibits/ExhibitRaycast.tsx"),
  keyboard: readProjectFile("apps/web/src/scenes/controls/useKeyboard.tsx"),
  player: readProjectFile("apps/web/src/scenes/Player/PlayerController.tsx"),
  pointerLockFailure: readProjectFile("apps/web/src/space/pointerLockFailure.ts"),
  pointerLock: readProjectFile("apps/web/src/space/requestSpacePointerLock.ts"),
  spaceScene: readProjectFile("apps/web/src/scenes/SpaceScene.tsx"),
  footsteps: readProjectFile("apps/web/src/scenes/Player/useFootsteps.ts"),
  desktop: readProjectFile("apps/web/src/pages/SpaceDesktopExperience.tsx"),
  colColliders: readProjectFile("apps/web/src/scenes/collision/colColliders.tsx"),
  floorCollider: readProjectFile("apps/web/src/scenes/gallery/GalleryFloorCollider.tsx"),
  safetyGround: readProjectFile("apps/web/src/scenes/gallery/SafetyGround.tsx"),
  materialScript: readProjectFile("scripts/apply-space-main-materials.py"),
  aoScript: readProjectFile("scripts/bake-space-main-ao.py"),
  topbar: readProjectFile("apps/web/src/components/TopBar.tsx"),
};

function cssBlock(selector) {
  const start = files.css.indexOf(`${selector} {`);
  assert(start >= 0, `${selector} CSS block must exist`);
  const end = files.css.indexOf("\n}", start);
  assert(end >= 0, `${selector} CSS block must close`);
  return files.css.slice(start, end);
}

const crosshairBurstCss = cssBlock(".crosshair-burst");
const cursorDotCss = cssBlock(".space-cursor-dot");
const cursorDragCss = cssBlock(".space-cursor-dot--dragReady,\n.space-cursor-dot--dragging");
const cursorReturningCss = cssBlock(".space-cursor-dot--returning");
const cursorSyncingCss = cssBlock(".space-cursor-dot--syncing");

assert(!files.cursor.includes('"text"'), "custom cursor must not switch into text caret mode");
assert(!files.cursor.includes("isTextElement"), "custom cursor must not detect ordinary text as a cursor mode");
assert(files.cursor.includes("lastPointerPositionRef"), "custom cursor must track latest system pointer coordinates");
assert(
  !files.cursor.includes("if (returning || document.pointerLockElement) return;"),
  "custom cursor must keep tracking pointer movement during return/sync animation",
);
assert(files.cursor.includes("!pointerLocked || returning"), "cursor must remain visible during return animation after pointer lock");
assert(
  files.cursor.includes("setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 })"),
  "cursor return animation must target the viewport center",
);
assert(
  /if\s*\(\s*options\?\.target\s*===\s*"pointer"\s*\)\s*\{\s*setPos\s*\(\s*lastPointerPositionRef\.current\s*\);\s*\}\s*else\s*\{\s*setPos\s*\(\s*\{\s*x:\s*window\.innerWidth\s*\/\s*2,\s*y:\s*window\.innerHeight\s*\/\s*2\s*\}\s*\);\s*\}/.test(files.cursor),
  "cursor return animation must default to center while keeping pointer target as an explicit option",
);
assert(files.cursorController.includes("type CursorReturnOptions"), "cursor return controller must expose visual options");
assert(
  !files.cursorController.includes("onComplete"),
  "cursor return controller must no longer delay pointer lock through an animation completion callback",
);
assert(
  files.pointerLock.indexOf("requestSpacePointerLock();") <
    files.pointerLock.indexOf('requestSpaceCursorReturn({ target: "center" });'),
  "pointer lock must be requested before the cursor return visual animation",
);
assert(cursorReturningCss.includes("left 500ms") && cursorReturningCss.includes("top 500ms"), "returning cursor must animate left/top");
assert(cursorSyncingCss.includes("left 500ms") && cursorSyncingCss.includes("top 500ms"), "syncing cursor must animate left/top");
assert(files.cursor.includes("space-cursor-halo"), "custom cursor must render the subtle halo element");
assert(cursorDotCss.includes("clip-path: circle(50% at 50% 50%)"), "default cursor must keep a stable dot clip-path");
assert(cursorDotCss.includes("clip-path 120ms ease"), "cursor shape transitions must be short to avoid drag-to-dot flashing");
assert(cursorDragCss.includes("width: 14px") && cursorDragCss.includes("height: 14px"), "drag cursor should avoid an oversized grab shape");
assert(
  cursorDragCss.includes("clip-path: circle(50% at 50% 50%)"),
  "drag cursor should keep the same circular shape family to avoid grab-to-dot flashing",
);

assert(crosshairBurstCss.includes("spaceCursorClickPulse"), "empty SPACE click pulse must reuse the cursor click pulse animation");
assert(files.player.includes("const WALK_SPEED = 2.45;"), "walk speed must return to the documented 2.45 m/s baseline");
assert(files.footsteps.includes("const SPRINT_SPEED = 3.85;"), "sprint speed must return to the documented 3.85 m/s baseline");
assert(files.player.includes("horizontalVelocity.current.lerp(tmp.targetVel, blend);"), "movement must keep inertial accel/decel via velocity lerp");
assert(files.player.includes("const MOVE_DECEL = 15;"), "movement stop inertia must keep the confirmed deceleration constant");
assert(!files.player.includes("horizontalVelocity.current.copy(tmp.targetVel)"), "movement must not snap directly to the target velocity");
assert(files.desktop.includes("const SPACE_PHYSICS_TIME_STEP = 1 / 60;"), "SPACE physics timestep must be explicit and fixed");
assert(
  files.desktop.includes("timeStep={SPACE_PHYSICS_TIME_STEP}"),
  "SPACE Physics must use the fixed timestep constant",
);
assert(files.player.includes("const PLAYER_PHYSICS_TIME_STEP = 1 / 60;"), "player movement must use the fixed physics timestep");
assert(files.player.includes("const dt = PLAYER_PHYSICS_TIME_STEP;"), "player movement must not use render-frame dt for physics");
assert(!files.player.includes("dtRef"), "player movement must not cache dynamic render dt for physics steps");
assert(!files.player.includes("Math.min(dt, 0.05)"), "player movement must not clamp render dt for physics movement");
assert(
  files.spaceScene.includes('import { GuardedPointerLockControls } from "./controls/GuardedPointerLockControls";'),
  "SPACE must use the guarded pointer lock controls implementation",
);
assert(
  files.spaceScene.includes('<GuardedPointerLockControls selector="#space-canvas" />'),
  "SPACE must render guarded pointer lock controls",
);
assert(!files.spaceScene.includes("@react-three/drei"), "SPACE must not use raw Drei PointerLockControls");
assert(
  files.guardedPointerLock.includes("requestPointerLockWithRawFallback"),
  "guarded pointer lock must request raw movement with a fallback",
);
assert(
  files.guardedPointerLock.includes("POINTER_LOCK_MAX_DELTA_PX"),
  "guarded pointer lock must define a maximum mouse delta",
);
assert(
  files.guardedPointerLock.includes("__SPACE_POINTER_LOCK_DEBUG_SAMPLES__"),
  "guarded pointer lock must retain raw pointer movement debug history in dev",
);
assert(
  files.guardedPointerLock.includes('reason: "spike"'),
  "guarded pointer lock must drop edge-spike movement events",
);
assert(
  files.guardedPointerLockControls.includes("resolveGuardedPointerDelta"),
  "guarded pointer lock controls must filter movement before rotating the camera",
);
assert(
  files.guardedPointerLockControls.includes("publishGuardedPointerLockDebugSample"),
  "guarded pointer lock controls must publish raw/applied pointer movement samples",
);
assert(
  files.pointerLock.includes("requestPointerLockWithRawFallback"),
  "shared SPACE pointer lock requests must use raw movement fallback",
);
assert(
  files.pointerLockFailure.includes("POINTER_LOCK_RESUME_TIMEOUT_MS = 900"),
  "pointer lock relock tracking must allow raw-movement fallback enough time to resolve",
);
assert(
  files.pointerLockFailure.includes("isPermanentPointerLockFailure"),
  "pointer lock failures must distinguish permanent API absence from retryable relock misses",
);
assert(
  files.pointerLock.includes("permanent: isPermanentPointerLockFailure(message)"),
  "pointer lock failure events must include permanent/retryable classification",
);
assert(
  files.desktop.includes("if (!permanent) return;"),
  "retryable pointer lock failures must not permanently disable first-person controls",
);
assert(files.keyboard.includes('window.addEventListener("blur", onBlur)'), "keyboard state must clear on window blur");
assert(files.floorCollider.includes("COL_STAIR"), "floor collider cutouts must include COL_STAIR_* regions");
assert(files.materialScript.includes('name.startswith("ARCH_STAIR_")'), "ARCH_STAIR_* must use the stair material contract");
assert(files.aoScript.includes('"ARCH_STAIR_"'), "vertex AO bake must include ARCH_STAIR_* visual stairs");

assert(files.debugTelemetry.includes('SPACE_MOVEMENT_DEBUG_EVENT = "space:movement-debug"'), "movement debug telemetry event must be defined");
assert(files.debugTelemetry.includes('SPACE_RAYCAST_DEBUG_EVENT = "space:raycast-debug"'), "raycast debug telemetry event must be defined");
assert(files.debugTelemetry.includes("registerSpaceCollisionDebugCollider"), "movement debug telemetry must register collider names by handle");
assert(files.debugTelemetry.includes("resolveSpaceCollisionDebugName"), "movement debug telemetry must resolve contact collider names");
assert(files.debugTelemetry.includes("publishSpaceRaycastDebug"), "debug telemetry must publish current pointer raycast mesh names");
assert(files.player.includes("publishSpaceMovementDebug"), "PlayerController must publish movement debug samples");
assert(files.exhibitRaycast.includes("publishSpaceRaycastDebug"), "ExhibitRaycast must publish the current pointer raycast mesh name");
assert(files.exhibitRaycast.includes("hitMeshName"), "ExhibitRaycast debug payload must include the hit mesh name");
assert(files.exhibitRaycast.includes("isIgnoredDebugRaycastObject"), "raycast debug must define ignored objects");
assert(files.exhibitRaycast.includes('startsWith("COL_")'), "raycast debug must ignore COL_* objects");
assert(
  files.exhibitRaycast.includes("!isIgnoredDebugRaycastObject(hit.object)"),
  "raycast debug must pick the first non-COL raycast hit",
);
assert(files.player.includes("numComputedCollisions"), "PlayerController must include character-controller collision counts in debug");
assert(files.player.includes("computedCollision"), "PlayerController must inspect computed collision colliders for debug");
assert(files.player.includes("speedRatio"), "PlayerController debug samples must include actual/desired speed ratio");
assert(files.player.includes("buildSpaceLookRotationDebugSample"), "PlayerController debug samples must include tick look rotation angles");
assert(files.player.includes("buildSpaceFrameRateDebugSample"), "PlayerController debug samples must include render frame rate telemetry");
assert(files.debugTelemetry.includes("lookRotation"), "movement debug samples must include look rotation angle telemetry");
assert(files.debugTelemetry.includes("frameRate"), "movement debug samples must include frame rate telemetry");
assert(
  files.debugTelemetry.includes("__SPACE_MOVEMENT_DEBUG_SAMPLES__"),
  "movement debug telemetry must retain tick-frequency history in dev",
);
assert(files.debugOverlay.includes("SpaceMovementDebugOverlay"), "dev movement debug overlay component must exist");
assert(files.debugOverlay.includes("import.meta.env.DEV"), "movement debug overlay must be dev-only");
assert(files.debugOverlay.includes(">debug<"), "debug overlay title must be generalized to DEBUG");
assert(files.debugOverlay.includes("contactNames"), "movement debug overlay must show contact collider names");
assert(files.debugOverlay.includes("speedRatio"), "movement debug overlay must show actual/desired speed ratio");
assert(files.debugOverlay.includes("<dt>fps</dt>"), "movement debug overlay must show realtime fps");
assert(files.debugOverlay.includes("look</dt>"), "movement debug overlay must show current look yaw and pitch");
assert(files.debugOverlay.includes("look delta</dt>"), "movement debug overlay must show per-tick look rotation deltas");
assert(files.debugOverlay.includes("raycastSample"), "debug overlay must store raycast debug samples");
assert(files.debugOverlay.includes("mesh</dt>"), "debug overlay must show the currently aimed mesh name");
assert(files.desktop.includes("<SpaceMovementDebugOverlay />"), "desktop SPACE page must mount the movement debug overlay");
assert(files.css.includes(".space-movement-debug"), "movement debug panel CSS must exist");
assert(files.colColliders.includes("registerSpaceCollisionDebugCollider"), "COL_* trimesh/cuboid colliders must register debug names");
assert(files.floorCollider.includes("registerSpaceCollisionDebugCollider"), "floor colliders must register debug names");
assert(files.safetyGround.includes("registerSpaceCollisionDebugCollider"), "safety ground collider must register a debug name");

assert(files.hoverHighlight.includes("restoreFrameRef"), "exhibit hover material restore should be deferred off the hot raycast path");
assert(files.hoverHighlight.includes("requestAnimationFrame"), "exhibit hover material restore should be scheduled with requestAnimationFrame");

assert(files.topbar.includes("isChangingLanguage"), "language toggle must guard against repeated async changes");
assert(files.topbar.includes("await i18n.changeLanguage(next)"), "language toggle must await i18n language changes");
assert(files.topbar.includes("document.documentElement.lang = next"), "language toggle must sync document language");

console.log("space interaction contract tests passed");
