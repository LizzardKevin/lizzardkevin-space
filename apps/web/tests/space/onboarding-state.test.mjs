import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

test("space onboarding advances only through move, look, and complete", async () => {
  const config = await importSourceModule("scenes/onboarding/spaceOnboardingConfig.ts");
  const onboarding = await importSourceModule("scenes/onboarding/spaceOnboardingState.ts");

  let state = onboarding.createInitialSpaceOnboardingState();
  assert.deepEqual(state, { step: "move", completed: false });

  state = onboarding.reduceSpaceOnboardingState(state, {
    type: "moveProgress",
    distanceM: config.SPACE_ONBOARDING_MOVE_DISTANCE_M - 0.01,
  });
  assert.equal(state.step, "move");

  state = onboarding.reduceSpaceOnboardingState(state, {
    type: "moveProgress",
    distanceM: config.SPACE_ONBOARDING_MOVE_DISTANCE_M,
  });
  assert.deepEqual(state, { step: "look", completed: false });

  state = onboarding.reduceSpaceOnboardingState(state, {
    type: "lookChanged",
    radians: config.SPACE_ONBOARDING_LOOK_RADIANS - 0.001,
  });
  assert.equal(state.step, "look");

  state = onboarding.reduceSpaceOnboardingState(state, {
    type: "lookChanged",
    radians: config.SPACE_ONBOARDING_LOOK_RADIANS,
  });
  assert.deepEqual(state, { step: "complete", completed: true });

  assert.equal(
    onboarding.reduceSpaceOnboardingState(state, {
      type: "moveProgress",
      distanceM: 100,
    }),
    state,
    "completed onboarding is stable",
  );
});

test("space onboarding exposes exactly the two approved world-space prompts", async () => {
  const config = await importSourceModule("scenes/onboarding/spaceOnboardingConfig.ts");
  const spawn = await importSourceModule("scenes/gallery/resolveGallerySpawn.ts");
  const gallery = await importSourceModule("scenes/gallery/galleryConfig.ts");

  assert.deepEqual(Object.keys(config.SPACE_ONBOARDING_SIGNS), ["move", "look"]);
  assert.deepEqual(config.SPACE_ONBOARDING_SIGNS.move.keycaps, ["W", "A", "S", "D"]);
  assert.equal(config.SPACE_ONBOARDING_SIGNS.look.keycaps, undefined);
  assert.deepEqual(config.SPACE_ONBOARDING_SPAWN, gallery.GALLERY_SPAWN);
  assert.equal(config.SPACE_ONBOARDING_SIGNS.move.position[0], gallery.GALLERY_SPAWN[0]);
  assert.equal(config.SPACE_ONBOARDING_SIGNS.look.position[0], gallery.GALLERY_SPAWN[0]);
  assert.equal(
    Number((config.SPACE_ONBOARDING_SIGNS.move.position[2] - gallery.GALLERY_SPAWN[2]).toFixed(1)),
    3.2,
  );
  assert.equal(
    Number((config.SPACE_ONBOARDING_SIGNS.look.position[2] - gallery.GALLERY_SPAWN[2]).toFixed(1)),
    6.2,
  );

  const expectedEyeY = Number(
    (config.SPACE_ONBOARDING_SPAWN[1] + spawn.EYE_OFFSET).toFixed(2),
  );
  assert.equal(config.SPACE_ONBOARDING_EYE_LEVEL_Y, expectedEyeY);
  for (const sign of Object.values(config.SPACE_ONBOARDING_SIGNS)) {
    assert.equal(sign.position[1], expectedEyeY, `${sign.id} sign y`);
    assert.match(sign.textKey, /^space\.onboarding\.(move|look)$/);
  }
});
