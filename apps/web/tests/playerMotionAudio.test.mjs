import assert from "node:assert/strict";
import test from "node:test";

test("walking head bob has a stronger but bounded amplitude", async () => {
  const motion = await import("../src/scenes/Player/playerMotion.ts");

  assert.equal(motion.WALK_HEAD_BOB_SPEED, 11.5);
  assert.equal(motion.WALK_HEAD_BOB_AMPLITUDE_M, 0.026);
  assert.equal(motion.walkHeadBobOffset(Math.PI / 2, 1), 0.026);
  assert.equal(motion.walkHeadBobOffset(Math.PI / 2, 0), 0);
});

test("footstep distance interval is at least doubled", async () => {
  const audioConfig = await import("../src/audio/audioConfig.ts");

  assert.ok(audioConfig.FOOTSTEP_INTERVAL_WALK >= 1.5);
  assert.ok(audioConfig.FOOTSTEP_INTERVAL_SPRINT >= 1.5);
});

test("footstep gain is louder than boosted jump start and land gain", async () => {
  const audioConfig = await import("../src/audio/audioConfig.ts");

  assert.ok(audioConfig.DEFAULT_VOLUMES.sfx > 0.24);
  assert.ok(audioConfig.JUMP_SFX_GAIN > 1.25);
  assert.ok(audioConfig.FOOTSTEP_SFX_GAIN > audioConfig.JUMP_SFX_GAIN);
});

test("landing step plays after non-jump airborne transition returns to grounded", async () => {
  const motion = await import("../src/scenes/Player/playerMotion.ts");

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
  const motion = await import("../src/scenes/Player/playerMotion.ts");

  assert.deepEqual(
    motion.nextLandingStepState({
      wasGrounded: false,
      grounded: true,
      landingStepArmed: false,
    }),
    { landingStepArmed: false, shouldPlayLandingStep: false },
  );
});

test("audio unlock primes procedural fallback and native footstep clips", async () => {
  const playedUrls = [];
  let resumed = 0;

  class FakeAudio {
    constructor(url) {
      this.url = url;
      this.preload = "";
      this.muted = false;
      this.volume = 1;
      this.currentTime = 0;
      this.paused = true;
      this.ended = false;
    }

    load() {}

    async play() {
      playedUrls.push(this.url);
      this.paused = false;
    }

    pause() {
      this.paused = true;
    }
  }

  class FakeAudioContext {
    constructor() {
      this.state = "suspended";
      this.sampleRate = 48_000;
    }

    async resume() {
      resumed += 1;
      this.state = "running";
    }
  }

  globalThis.Audio = FakeAudio;
  globalThis.AudioContext = FakeAudioContext;

  const { primeSpaceAudioOnGesture } = await import("../src/audio/audioUnlock.ts");
  const { clearFootstepPools } = await import("../src/audio/footstepPlayer.ts");

  clearFootstepPools();

  primeSpaceAudioOnGesture(["/audio/footstep_01.wav", "/audio/footstep_02.wav"]);
  await Promise.resolve();

  assert.equal(resumed, 1);
  assert.deepEqual(playedUrls, ["/audio/footstep_01.wav", "/audio/footstep_02.wav"]);

  clearFootstepPools();
  delete globalThis.Audio;
  delete globalThis.AudioContext;
});
