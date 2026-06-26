import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { importSourceModule, projectPath, publicPath } from "../helpers/projectPaths.mjs";

import { readMono16WavMetrics } from "../helpers/audio.mjs";

test("footsteps use five clip variants and random selection avoids immediate repeats", async () => {
  const audioConfig = await importSourceModule("audio/audioConfig.ts");
  const { chooseFootstepUrl } = await importSourceModule("audio/footstepPlayer.ts");

  assert.equal(audioConfig.AUDIO_PATHS.footstepUrls.length, 5);

  const urls = ["/a.wav", "/b.wav", "/c.wav", "/d.wav", "/e.wav"];
  const first = chooseFootstepUrl(urls, undefined, () => 0.6);
  const second = chooseFootstepUrl(urls, first, () => urls.indexOf(first) / urls.length);

  assert.equal(first, "/d.wav");
  assert.notEqual(second, first);
  assert.ok(urls.includes(second));
});

test("footstep wav variants stay close to the original clip loudness", async () => {
  const audioConfig = await importSourceModule("audio/audioConfig.ts");
  const audioDir = publicPath("audio");

  for (const url of audioConfig.AUDIO_PATHS.footstepUrls) {
    const metrics = readMono16WavMetrics(path.join(audioDir, path.basename(url)));
    assert.ok(metrics.peak <= 0.08, `${url} peak ${metrics.peak}`);
    assert.ok(metrics.rms >= 0.011, `${url} rms too quiet ${metrics.rms}`);
    assert.ok(metrics.rms <= 0.02, `${url} rms too loud ${metrics.rms}`);
    assert.ok(metrics.shortRms <= 0.045, `${url} shortRms ${metrics.shortRms}`);
  }
});

test("generated footstep variants are quieter transforms of the first footstep", async () => {
  const audioDir = publicPath("audio");
  const base = readMono16WavMetrics(path.join(audioDir, "footstep_01.wav"));

  for (const filename of ["footstep_04.wav", "footstep_05.wav"]) {
    const metrics = readMono16WavMetrics(path.join(audioDir, filename));
    assert.ok(metrics.peak <= base.peak * 0.82, `${filename} peak ${metrics.peak}`);
    assert.ok(metrics.rms <= base.rms * 0.82, `${filename} rms ${metrics.rms}`);
    assert.ok(metrics.shortRms <= base.shortRms * 0.82, `${filename} shortRms ${metrics.shortRms}`);
  }
});
