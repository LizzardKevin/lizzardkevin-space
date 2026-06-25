import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));

function readMono16WavMetrics(filePath) {
  const data = fs.readFileSync(filePath);
  assert.equal(data.toString("ascii", 0, 4), "RIFF");
  assert.equal(data.toString("ascii", 8, 12), "WAVE");

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let pcm = null;
  while (offset + 8 <= data.length) {
    const chunkId = data.toString("ascii", offset, offset + 4);
    const chunkSize = data.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (chunkId === "fmt ") {
      channels = data.readUInt16LE(chunkStart + 2);
      sampleRate = data.readUInt32LE(chunkStart + 4);
      bitsPerSample = data.readUInt16LE(chunkStart + 14);
    }
    if (chunkId === "data") {
      pcm = data.subarray(chunkStart, chunkStart + chunkSize);
      break;
    }
    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  assert.equal(channels, 1);
  assert.equal(bitsPerSample, 16);
  assert.ok(pcm);

  const samples = [];
  for (let index = 0; index < pcm.length; index += 2) {
    samples.push(pcm.readInt16LE(index) / 32768);
  }
  const peak = Math.max(...samples.map(Math.abs));
  const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
  const windowSize = Math.max(1, Math.floor(sampleRate * 0.025));
  let shortRms = 0;
  for (let index = 0; index < samples.length; index += Math.floor(windowSize / 2)) {
    const window = samples.slice(index, index + windowSize);
    const value = Math.sqrt(window.reduce((sum, sample) => sum + sample * sample, 0) / window.length);
    shortRms = Math.max(shortRms, value);
  }

  return { peak, rms, shortRms, samples };
}

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

test("space background music uses the quiet loop remix asset", async () => {
  const audioConfig = await import("../src/audio/audioConfig.ts");

  const bgmUrl = audioConfig.AUDIO_PATHS.zoneBgmUrls.architecture;
  assert.equal(bgmUrl, "/audio/space_background_looped.mp3");
  assert.deepEqual(audioConfig.AUDIO_PATHS.zoneAmbientUrls, {});
  assert.equal(audioConfig.SPACE_BGM_FADE_IN_DELAY_MS, 10_000);
  assert.ok(audioConfig.SPACE_BGM_FADE_IN_MS >= 3_000);
  assert.ok(audioConfig.DEFAULT_VOLUMES.bgm >= 0.05);
  assert.ok(audioConfig.DEFAULT_VOLUMES.bgm <= 0.18);

  const audioDir = path.resolve(testDir, "../public/audio");
  const bgmPath = path.join(audioDir, path.basename(bgmUrl));
  assert.equal(fs.existsSync(path.join(audioDir, "space_background_loop.mp3")), false);
  const file = fs.readFileSync(bgmPath);
  assert.ok(file.length > 1_000_000, "background remix should be a real music file");
  assert.ok(
    file.toString("ascii", 0, 3) === "ID3" || file[0] === 0xff,
    "background remix should be an MP3 file",
  );
});

test("space background remix script prepares a crossfaded loop instead of tail fade-out", () => {
  const script = fs.readFileSync(path.resolve(testDir, "../../../scripts/remix-space-background.mjs"), "utf8");

  assert.match(script, /acrossfade/);
  assert.doesNotMatch(script, /afade=t=out/);
});

test("footsteps use five clip variants and random selection avoids immediate repeats", async () => {
  const audioConfig = await import("../src/audio/audioConfig.ts");
  const { chooseFootstepUrl } = await import("../src/audio/footstepPlayer.ts");

  assert.equal(audioConfig.AUDIO_PATHS.footstepUrls.length, 5);

  const urls = ["/a.wav", "/b.wav", "/c.wav", "/d.wav", "/e.wav"];
  const first = chooseFootstepUrl(urls, undefined, () => 0.6);
  const second = chooseFootstepUrl(urls, first, () => urls.indexOf(first) / urls.length);

  assert.equal(first, "/d.wav");
  assert.notEqual(second, first);
  assert.ok(urls.includes(second));
});

test("footstep wav variants stay close to the original clip loudness", async () => {
  const audioConfig = await import("../src/audio/audioConfig.ts");
  const audioDir = path.resolve(testDir, "../public/audio");

  for (const url of audioConfig.AUDIO_PATHS.footstepUrls) {
    const metrics = readMono16WavMetrics(path.join(audioDir, path.basename(url)));
    assert.ok(metrics.peak <= 0.08, `${url} peak ${metrics.peak}`);
    assert.ok(metrics.rms >= 0.011, `${url} rms too quiet ${metrics.rms}`);
    assert.ok(metrics.rms <= 0.02, `${url} rms too loud ${metrics.rms}`);
    assert.ok(metrics.shortRms <= 0.045, `${url} shortRms ${metrics.shortRms}`);
  }
});

test("generated footstep variants are quieter transforms of the first footstep", async () => {
  const audioDir = path.resolve(testDir, "../public/audio");
  const base = readMono16WavMetrics(path.join(audioDir, "footstep_01.wav"));

  for (const filename of ["footstep_04.wav", "footstep_05.wav"]) {
    const metrics = readMono16WavMetrics(path.join(audioDir, filename));
    assert.ok(metrics.peak <= base.peak * 0.82, `${filename} peak ${metrics.peak}`);
    assert.ok(metrics.rms <= base.rms * 0.82, `${filename} rms ${metrics.rms}`);
    assert.ok(metrics.shortRms <= base.shortRms * 0.82, `${filename} shortRms ${metrics.shortRms}`);
  }
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

test("player spawn reset starts grounded without an artificial landing step", async () => {
  const motion = await import("../src/scenes/Player/playerMotion.ts");

  assert.deepEqual(motion.initialPlayerSpawnMotionState(), {
    grounded: true,
    verticalVelocity: 0,
    landingStepArmed: false,
  });
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
