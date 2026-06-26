import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

test("walking head bob has a stronger but bounded amplitude", async () => {
  const motion = await importSourceModule("scenes/Player/playerMotion.ts");

  assert.equal(motion.WALK_HEAD_BOB_SPEED, 11.5);
  assert.equal(motion.WALK_HEAD_BOB_AMPLITUDE_M, 0.026);
  assert.equal(motion.walkHeadBobOffset(Math.PI / 2, 1), 0.026);
  assert.equal(motion.walkHeadBobOffset(Math.PI / 2, 0), 0);
});

test("landing step plays after non-jump airborne transition returns to grounded", async () => {
  const motion = await importSourceModule("scenes/Player/playerMotion.ts");

  const airborne = motion.nextLandingStepState({
    wasGrounded: true,
    grounded: false,
    landingStepArmed: false,
  });
  assert.deepEqual(airborne, { landingStepArmed: true, shouldPlayLandingStep: false });

  const landed = motion.nextLandingStepState({
    wasGrounded: false,
    grounded: true,
    landingStepArmed: airborne.landingStepArmed,
  });
  assert.deepEqual(landed, { landingStepArmed: false, shouldPlayLandingStep: true });
});

test("initial grounded contact does not play a landing step", async () => {
  const motion = await importSourceModule("scenes/Player/playerMotion.ts");

  assert.deepEqual(
    motion.nextLandingStepState({
      wasGrounded: false,
      grounded: true,
      landingStepArmed: false,
    }),
    { landingStepArmed: false, shouldPlayLandingStep: false },
  );
});

test("player spawn reset starts grounded without an artificial landing step", async () => {
  const motion = await importSourceModule("scenes/Player/playerMotion.ts");

  assert.deepEqual(motion.initialPlayerSpawnMotionState(), {
    grounded: true,
    verticalVelocity: 0,
    landingStepArmed: false,
  });
});
