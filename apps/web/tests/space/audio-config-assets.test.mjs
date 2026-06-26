import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { importSourceModule, projectPath, publicPath } from "../helpers/projectPaths.mjs";

test("footstep distance interval is at least doubled", async () => {
  const audioConfig = await importSourceModule("audio/audioConfig.ts");

  assert.ok(audioConfig.FOOTSTEP_INTERVAL_WALK >= 1.5);
  assert.ok(audioConfig.FOOTSTEP_INTERVAL_SPRINT >= 1.5);
});

test("footstep gain is louder than boosted jump start and land gain", async () => {
  const audioConfig = await importSourceModule("audio/audioConfig.ts");

  assert.ok(audioConfig.DEFAULT_VOLUMES.sfx > 0.24);
  assert.ok(audioConfig.JUMP_SFX_GAIN > 1.25);
  assert.ok(audioConfig.FOOTSTEP_SFX_GAIN > audioConfig.JUMP_SFX_GAIN);
});

test("space background music uses the quiet loop remix asset", async () => {
  const audioConfig = await importSourceModule("audio/audioConfig.ts");

  const bgmUrl = audioConfig.AUDIO_PATHS.zoneBgmUrls.architecture;
  assert.equal(bgmUrl, "/audio/space_background_looped.mp3");
  assert.deepEqual(audioConfig.AUDIO_PATHS.zoneAmbientUrls, {});
  assert.equal(audioConfig.SPACE_BGM_FADE_IN_DELAY_MS, 10_000);
  assert.ok(audioConfig.SPACE_BGM_FADE_IN_MS >= 3_000);
  assert.ok(audioConfig.DEFAULT_VOLUMES.bgm >= 0.05);
  assert.ok(audioConfig.DEFAULT_VOLUMES.bgm <= 0.18);

  const audioDir = publicPath("audio");
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
  const script = fs.readFileSync(projectPath("scripts/remix-space-background.mjs"), "utf8");

  assert.match(script, /acrossfade/);
  assert.doesNotMatch(script, /afade=t=out/);
});
