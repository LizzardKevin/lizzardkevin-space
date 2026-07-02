import assert from "node:assert/strict";
import { files } from "../helpers/spaceContractFixture.mjs";

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
assert(files.player.includes("const JUMP_ATTEMPT_UNLOCK_COUNT = 5;"), "jump easter egg should unlock after five attempts");
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
assert(
  !files.galleryModel.includes("GalleryFloorCollider"),
  "SPACE must not mount a generated floor collider; authored COL_* meshes own collision shape",
);
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
assert(
  files.exhibitRaycast.includes("useExhibitInteractionTargets") &&
    files.exhibitRaycast.includes("interactionTargets"),
  "raycast debug should inspect only registered interaction targets after removing full-scene raycast traversal",
);
assert(!files.exhibitRaycast.includes("isIgnoredDebugRaycastObject"), "registry raycasts should not need COL_* debug filtering");
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
assert(
  files.debugOverlay.includes("useTranslation") && files.debugOverlay.includes('t("debug.title")'),
  "debug overlay title must come from localized debug copy",
);
assert(files.debugOverlay.includes("contactNames"), "movement debug overlay must show contact collider names");
assert(files.debugOverlay.includes("speedRatio"), "movement debug overlay must show actual/desired speed ratio");
for (const debugKey of [
  "debug.label",
  "debug.mesh",
  "debug.exhibit",
  "debug.fps",
  "debug.look",
  "debug.lookDelta",
  "debug.contact",
]) {
  assert(files.debugOverlay.includes(`"${debugKey}"`), `movement debug overlay must read ${debugKey}`);
}
assert(files.debugOverlay.includes("raycastSample"), "debug overlay must store raycast debug samples");
assert(files.desktop.includes("<SpaceMovementDebugOverlay />"), "desktop SPACE page must mount the movement debug overlay");
assert(files.css.includes(".space-movement-debug"), "movement debug panel CSS must exist");
assert(files.colColliders.includes("registerSpaceCollisionDebugCollider"), "COL_* trimesh colliders must register debug names");
assert(files.colColliders.includes("TrimeshCollider"), "COL_* meshes must use their baked mesh geometry");
assert(!files.colColliders.includes("CuboidCollider"), "COL_* meshes must not be resized into cuboid colliders");
assert(!files.colColliders.includes("COL_inner"), "COL_inner meshes must not receive a special runtime sizing path");
assert(files.materialScript.includes('name.startswith("COL_")'), "material pipeline should preserve authored COL_* meshes");
assert(
  !files.colColliders.includes("prop-fallback") && !files.colColliders.includes("fallback cuboid"),
  "SPACE collisions must come from explicitly named COL_* meshes, not inferred prop_* fallback colliders",
);
assert(files.safetyGround.includes("registerSpaceCollisionDebugCollider"), "safety ground collider must register a debug name");

console.log("space movement debug contract tests passed");
