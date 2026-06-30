import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { importSourceModule, projectPath } from "../helpers/projectPaths.mjs";

function signLabels(signs) {
  return signs.map((sign) => `${sign.id}:${sign.status}`);
}

function queueLabels(queue) {
  return signLabels(queue.signs);
}

test("space onboarding advances through the corridor tutorial in order", async () => {
  assert.ok(
    existsSync(projectPath("apps/web/src/scenes/onboarding/spaceOnboardingState.ts")),
    "space onboarding state module must exist",
  );

  const onboarding = await importSourceModule("scenes/onboarding/spaceOnboardingState.ts");

  let state = onboarding.createInitialSpaceOnboardingState();
  assert.equal(state.step, "notice");
  assert.equal(state.completed, false);

  state = onboarding.reduceSpaceOnboardingState(state, { type: "escUnlocked" });
  assert.equal(state.step, "notice", "Esc cannot progress before the demo focus closes");

  state = onboarding.reduceSpaceOnboardingState(state, { type: "moveProgress", distanceM: 8 });
  assert.equal(state.step, "notice", "walking cannot skip the opening version notice");

  state = onboarding.reduceSpaceOnboardingState(state, { type: "noticeViewed" });
  assert.equal(state.step, "move");

  state = onboarding.reduceSpaceOnboardingState(state, { type: "moveProgress", distanceM: 1.39 });
  assert.equal(state.step, "move");

  state = onboarding.reduceSpaceOnboardingState(state, { type: "moveProgress", distanceM: 1.4 });
  assert.equal(state.step, "look");

  state = onboarding.reduceSpaceOnboardingState(state, { type: "lookChanged", radians: 0.13 });
  assert.equal(state.step, "look", "turning alone should not complete the target practice sign");

  state = onboarding.reduceSpaceOnboardingState(state, { type: "lookTargeted" });
  assert.equal(state.step, "demo");

  state = onboarding.reduceSpaceOnboardingState(state, { type: "demoOpened" });
  assert.equal(state.step, "focus");

  state = onboarding.reduceSpaceOnboardingState(state, { type: "demoClosed" });
  assert.equal(state.step, "esc");

  state = onboarding.reduceSpaceOnboardingState(state, { type: "escUnlocked" });
  assert.equal(state.step, "relock");

  state = onboarding.reduceSpaceOnboardingState(state, { type: "relocked" });
  assert.equal(state.step, "done");
  assert.equal(state.completed, false, "the final corridor sign should remain visible briefly");

  state = onboarding.reduceSpaceOnboardingState(state, { type: "doneViewed" });
  assert.equal(state.step, "done");
  assert.equal(state.completed, true);
});

test("space onboarding waits for the look sign raycast before showing the demo sign", async () => {
  assert.ok(
    existsSync(projectPath("apps/web/src/scenes/onboarding/spaceOnboardingState.ts")),
    "space onboarding state module must exist",
  );

  const onboarding = await importSourceModule("scenes/onboarding/spaceOnboardingState.ts");

  let state = onboarding.createInitialSpaceOnboardingState();
  state = onboarding.reduceSpaceOnboardingState(state, { type: "noticeViewed" });
  state = onboarding.reduceSpaceOnboardingState(state, { type: "moveProgress", distanceM: 1.4 });
  assert.equal(state.step, "look");

  state = onboarding.reduceSpaceOnboardingState(state, { type: "demoGateReached" });
  assert.equal(state.step, "look", "walking past the gate should not skip the aim-at-me lesson");

  state = onboarding.reduceSpaceOnboardingState(state, { type: "lookTargeted" });
  assert.equal(state.step, "demo");
});

test("space onboarding signs align to grounded player eye height", async () => {
  const onboardingConfig = await importSourceModule("scenes/onboarding/spaceOnboardingConfig.ts");
  const spawn = await importSourceModule("scenes/gallery/resolveGallerySpawn.ts");

  const expectedEyeY = Number((onboardingConfig.SPACE_ONBOARDING_SPAWN[1] + spawn.EYE_OFFSET).toFixed(2));

  assert.equal(onboardingConfig.SPACE_ONBOARDING_EYE_LEVEL_Y, expectedEyeY);
  assert.ok(onboardingConfig.SPACE_ONBOARDING_EYE_LEVEL_Y < 38, "signs should not float above eye level");

  for (const sign of Object.values(onboardingConfig.SPACE_ONBOARDING_SIGNS)) {
    assert.equal(sign.position[1], onboardingConfig.SPACE_ONBOARDING_EYE_LEVEL_Y, `${sign.id} sign y`);
  }
});

test("space onboarding demo hit area targets the visible text instead of the transparent canvas", async () => {
  const config = await importSourceModule("scenes/onboarding/spaceOnboardingConfig.ts");

  assert.deepEqual(config.SPACE_ONBOARDING_DEMO_TEXT_HIT_SIZE, [2.05, 0.42]);
  assert.deepEqual(config.SPACE_ONBOARDING_DEMO_HIT_SIZE, config.SPACE_ONBOARDING_DEMO_TEXT_HIT_SIZE);
  assert.ok(
    config.SPACE_ONBOARDING_DEMO_TEXT_HIT_SIZE[0] < config.SPACE_ONBOARDING_SIGNS.demo.hitSizeM[0],
    "demo text hit width should be tighter than the padded PNG canvas",
  );
  assert.ok(
    config.SPACE_ONBOARDING_DEMO_TEXT_HIT_SIZE[1] < config.SPACE_ONBOARDING_SIGNS.demo.hitSizeM[1],
    "demo text hit height should be tighter than the padded PNG canvas",
  );
});

test("space onboarding resolves localized PNG assets from current language", async () => {
  const config = await importSourceModule("scenes/onboarding/spaceOnboardingConfig.ts");
  const moveSign = config.SPACE_ONBOARDING_SIGNS.move;

  assert.equal(
    config.resolveSpaceOnboardingSignImageSrc(moveSign, "en"),
    "/onboarding/space-onboarding-move-en.png",
  );
  assert.equal(
    config.resolveSpaceOnboardingSignImageSrc(moveSign, "en-US"),
    "/onboarding/space-onboarding-move-en.png",
  );
  assert.equal(
    config.resolveSpaceOnboardingSignImageSrc(moveSign, "zh"),
    "/onboarding/space-onboarding-move.png",
  );
  assert.equal(
    config.resolveSpaceOnboardingSignImageSrc(moveSign, undefined),
    "/onboarding/space-onboarding-move.png",
  );
});

test("space onboarding sign timing constants match the approved queue timings", async () => {
  const visibility = await importSourceModule("scenes/onboarding/spaceOnboardingSignVisibility.ts");

  assert.equal(visibility.SPACE_ONBOARDING_SIGN_ENTER_MS, 500);
  assert.equal(visibility.SPACE_ONBOARDING_NOTICE_ENTER_MS, 260);
  assert.equal(visibility.SPACE_ONBOARDING_SIGN_DISSOLVE_MS, 950);
  assert.equal(visibility.SPACE_ONBOARDING_SIGN_DISSOLVE_LEAD_M, 1);
  assert.equal(visibility.SPACE_ONBOARDING_SIGN_NEXT_DELAY_MS, 100);
  assert.equal(visibility.SPACE_ONBOARDING_NOTICE_COMPLETE_FALLBACK_MS, 0);
});

test("space onboarding notice enters faster than ordinary signs", async () => {
  const visibility = await importSourceModule("scenes/onboarding/spaceOnboardingSignVisibility.ts");

  let queue = visibility.updateSpaceOnboardingSignQueue(visibility.createInitialSpaceOnboardingSignQueueState(), {
    activeSignId: "notice",
    cameraZ: -48.32,
    nowMs: 0,
  });
  assert.deepEqual(queueLabels(queue), ["notice:enter"]);

  queue = visibility.updateSpaceOnboardingSignQueue(queue, {
    activeSignId: "notice",
    cameraZ: -48.32,
    nowMs: visibility.SPACE_ONBOARDING_NOTICE_ENTER_MS,
  });
  assert.deepEqual(queueLabels(queue), ["notice:visible"]);

  queue = visibility.updateSpaceOnboardingSignQueue(visibility.createInitialSpaceOnboardingSignQueueState(), {
    activeSignId: "move",
    cameraZ: -48.32,
    nowMs: 0,
  });
  queue = visibility.updateSpaceOnboardingSignQueue(queue, {
    activeSignId: "move",
    cameraZ: -48.32,
    nowMs: visibility.SPACE_ONBOARDING_NOTICE_ENTER_MS,
  });
  assert.deepEqual(queueLabels(queue), ["move:enter"], "ordinary signs should keep the slower enter timing");
});

test("space onboarding signs serialize ordinary prompts through enter, exit, and dissolve", async () => {
  const visibility = await importSourceModule("scenes/onboarding/spaceOnboardingSignVisibility.ts");
  const config = await importSourceModule("scenes/onboarding/spaceOnboardingConfig.ts");
  const enterMs = visibility.SPACE_ONBOARDING_SIGN_ENTER_MS ?? 500;
  const dissolveMs = visibility.SPACE_ONBOARDING_SIGN_DISSOLVE_MS ?? 950;
  const moveSignZ = config.SPACE_ONBOARDING_SIGNS.move.position[2];
  const leadM = visibility.SPACE_ONBOARDING_SIGN_DISSOLVE_LEAD_M ?? 1;
  const moveExitZ = moveSignZ - leadM;

  let queue = visibility.updateSpaceOnboardingSignQueue(visibility.createInitialSpaceOnboardingSignQueueState(), {
    activeSignId: "move",
    cameraZ: -48.32,
    nowMs: 0,
  });
  assert.deepEqual(queueLabels(queue), ["move:enter"]);

  queue = visibility.updateSpaceOnboardingSignQueue(queue, {
    activeSignId: "move",
    cameraZ: -48.32,
    nowMs: enterMs,
  });
  assert.deepEqual(queueLabels(queue), ["move:visible"]);

  queue = visibility.updateSpaceOnboardingSignQueue(queue, {
    activeSignId: "look",
    cameraZ: moveExitZ,
    nowMs: enterMs + 25,
  });
  assert.deepEqual(queueLabels(queue), ["move:exiting"], "the look sign waits until move dissolves");

  queue = visibility.updateSpaceOnboardingSignQueue(queue, {
    activeSignId: "look",
    cameraZ: moveExitZ,
    nowMs: enterMs + 25 + dissolveMs - 1,
  });
  assert.deepEqual(queueLabels(queue), ["move:exiting"]);

  queue = visibility.updateSpaceOnboardingSignQueue(queue, {
    activeSignId: "look",
    cameraZ: moveExitZ,
    nowMs: enterMs + 25 + dissolveMs,
  });
  assert.deepEqual(queueLabels(queue), [], "the next ordinary sign waits after the previous dissolves");

  queue = visibility.updateSpaceOnboardingSignQueue(queue, {
    activeSignId: "look",
    cameraZ: moveExitZ,
    nowMs: enterMs + 25 + dissolveMs + visibility.SPACE_ONBOARDING_SIGN_NEXT_DELAY_MS - 1,
  });
  assert.deepEqual(queueLabels(queue), [], "the next ordinary sign does not appear during the delay");

  queue = visibility.updateSpaceOnboardingSignQueue(queue, {
    activeSignId: "look",
    cameraZ: moveExitZ,
    nowMs: enterMs + 25 + dissolveMs + visibility.SPACE_ONBOARDING_SIGN_NEXT_DELAY_MS,
  });
  assert.deepEqual(queueLabels(queue), ["look:enter"], "the next ordinary sign appears after the delay");
});

test("space onboarding signs start dissolving within the lead distance before the sign", async () => {
  const visibility = await importSourceModule("scenes/onboarding/spaceOnboardingSignVisibility.ts");
  const config = await importSourceModule("scenes/onboarding/spaceOnboardingConfig.ts");
  const moveSignZ = config.SPACE_ONBOARDING_SIGNS.move.position[2];
  const leadM = visibility.SPACE_ONBOARDING_SIGN_DISSOLVE_LEAD_M ?? 1;

  let signs = [
    {
      id: "move",
      status: "visible",
      firstSeenAtMs: 0,
      exitStartedAtMs: null,
    },
  ];

  signs = visibility.updateSpaceOnboardingVisibleSigns(signs, {
    activeSignId: "look",
    cameraZ: moveSignZ - leadM - 0.01,
    nowMs: 600,
  });
  assert.deepEqual(signLabels(signs), ["move:visible"], "the sign should not exit before the lead distance");

  signs = visibility.updateSpaceOnboardingVisibleSigns(signs, {
    activeSignId: "look",
    cameraZ: moveSignZ - leadM,
    nowMs: 650,
  });
  assert.equal(signs[0]?.status, "exiting", "the sign exits before the player passes it");
  assert.equal(signs[0]?.exitStartedAtMs, 650);
});

test("space onboarding signs fall back to exiting after operation completion if the player stops", async () => {
  const visibility = await importSourceModule("scenes/onboarding/spaceOnboardingSignVisibility.ts");

  let signs = [
    {
      id: "look",
      status: "visible",
      firstSeenAtMs: 0,
      exitStartedAtMs: null,
    },
  ];

  signs = visibility.updateSpaceOnboardingVisibleSigns(signs, {
    activeSignId: "demo",
    cameraZ: -46.5,
    nowMs: 700,
  });
  assert.deepEqual(signLabels(signs), ["look:visible"]);

  signs = visibility.updateSpaceOnboardingVisibleSigns(signs, {
    activeSignId: "demo",
    cameraZ: -46.5,
    nowMs: 1700,
  });
  assert.deepEqual(signLabels(signs), ["look:exiting"], "completed signs should not stall forever");
});

test("space onboarding swaps the visible Esc sign into the relock prompt", async () => {
  const onboarding = await importSourceModule("scenes/onboarding/spaceOnboardingState.ts");
  const visibility = await importSourceModule("scenes/onboarding/spaceOnboardingSignVisibility.ts");

  let state = { step: "esc", completed: false };
  let signs = [
    {
      id: "esc",
      status: "visible",
      firstSeenAtMs: 0,
      exitStartedAtMs: null,
    },
  ];

  state = onboarding.reduceSpaceOnboardingState(state, { type: "escUnlocked" });
  assert.equal(state.step, "relock");

  signs = visibility.updateSpaceOnboardingVisibleSigns(signs, {
    activeSignId: state.step,
    cameraZ: -35.8,
    nowMs: 900,
  });
  assert.deepEqual(signLabels(signs), ["relock:visible"]);
});

test("space onboarding shows the done sign only after the relock prompt exits", async () => {
  const onboarding = await importSourceModule("scenes/onboarding/spaceOnboardingState.ts");
  const visibility = await importSourceModule("scenes/onboarding/spaceOnboardingSignVisibility.ts");
  const config = await importSourceModule("scenes/onboarding/spaceOnboardingConfig.ts");
  const dissolveMs = visibility.SPACE_ONBOARDING_SIGN_DISSOLVE_MS ?? 950;
  const leadM = visibility.SPACE_ONBOARDING_SIGN_DISSOLVE_LEAD_M ?? 1;
  const relockSignZ = config.SPACE_ONBOARDING_SIGNS.relock.position[2];

  let state = { step: "relock", completed: false };
  let queue = {
    signs: [
      {
        id: "relock",
        status: "visible",
        firstSeenAtMs: 900,
        exitStartedAtMs: null,
        operationCompletedAtMs: null,
      },
    ],
    nextSignAllowedAtMs: null,
    pendingSignId: null,
  };

  state = onboarding.reduceSpaceOnboardingState(state, { type: "relocked" });
  assert.equal(state.step, "done");
  assert.equal(state.completed, false);

  queue = visibility.updateSpaceOnboardingSignQueue(queue, {
    activeSignId: state.step,
    cameraZ: relockSignZ - leadM,
    nowMs: 1000,
  });
  assert.deepEqual(queueLabels(queue), ["relock:exiting"], "done waits behind the relock prompt");

  queue = visibility.updateSpaceOnboardingSignQueue(queue, {
    activeSignId: state.step,
    cameraZ: relockSignZ - leadM,
    nowMs: 1000 + dissolveMs,
  });
  assert.deepEqual(queueLabels(queue), []);

  queue = visibility.updateSpaceOnboardingSignQueue(queue, {
    activeSignId: state.step,
    cameraZ: relockSignZ - leadM,
    nowMs: 1000 + dissolveMs + visibility.SPACE_ONBOARDING_SIGN_NEXT_DELAY_MS,
  });
  assert.deepEqual(queueLabels(queue), ["done:enter"]);
});
