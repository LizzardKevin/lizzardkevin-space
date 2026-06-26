import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

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

  const { primeSpaceAudioOnGesture } = await importSourceModule("audio/audioUnlock.ts");
  const { clearFootstepPools } = await importSourceModule("audio/footstepPlayer.ts");

  clearFootstepPools();

  primeSpaceAudioOnGesture(["/audio/footstep_01.wav", "/audio/footstep_02.wav"]);
  await Promise.resolve();

  assert.equal(resumed, 1);
  assert.deepEqual(playedUrls, ["/audio/footstep_01.wav", "/audio/footstep_02.wav"]);

  clearFootstepPools();
  delete globalThis.Audio;
  delete globalThis.AudioContext;
});
