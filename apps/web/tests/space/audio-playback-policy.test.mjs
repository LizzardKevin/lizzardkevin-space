import assert from "node:assert/strict";
import test from "node:test";
import {
  canStartAsyncAudio,
  createAudioPlaybackPolicy,
  effectiveProceduralAmbientGain,
  effectiveLoopVolume,
  resolveAmbientLoadErrorAction,
  setLoopDucked,
  setRoutePaused,
} from "../../src/audio/audioPlaybackPolicy.ts";

test("route resume restores the effective ducked channel targets", () => {
  let policy = createAudioPlaybackPolicy();
  policy = setLoopDucked(policy, "bgm", true);
  policy = setLoopDucked(policy, "ambient", true);
  policy = setRoutePaused(policy, true);
  policy = setRoutePaused(policy, false);

  assert.equal(effectiveLoopVolume(policy, "bgm", 0.6), 0.27);
  assert.equal(effectiveLoopVolume(policy, "ambient", 0.6), 0.21);
});

test("async play and fallback paths remain blocked while a route is paused", () => {
  const paused = setRoutePaused(createAudioPlaybackPolicy(), true);
  assert.equal(canStartAsyncAudio(paused), false);
  assert.equal(resolveAmbientLoadErrorAction(paused, true), "defer-fallback");
  assert.equal(resolveAmbientLoadErrorAction(paused, false), "ignore");
  assert.equal(canStartAsyncAudio(setRoutePaused(paused, false)), true);
});

test("procedural ambient fallback preserves master volume and ambient ducking", () => {
  const ducked = setLoopDucked(createAudioPlaybackPolicy(), "ambient", true);
  assert.equal(effectiveProceduralAmbientGain(ducked, 0.9, 0.6), 0.189);
  assert.equal(resolveAmbientLoadErrorAction(ducked, true), "start-fallback");
});
