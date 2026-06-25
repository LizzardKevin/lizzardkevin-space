import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

const defaultSource = path.join(os.homedir(), "Downloads", "星屑の館.mp3");
const sourcePath = path.resolve(process.argv[2] ?? process.env.SPACE_BGM_SOURCE ?? defaultSource);
const outputPath = path.resolve(
  process.argv[3] ?? process.env.SPACE_BGM_OUTPUT ?? "apps/web/public/audio/space_background_looped.mp3",
);

if (!ffmpegPath) {
  throw new Error("ffmpeg-static did not provide a usable ffmpeg binary for this platform.");
}

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Source MP3 not found: ${sourcePath}`);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

function runFfmpeg(args, options = {}) {
  const result = spawnSync(ffmpegPath, args, {
    encoding: "utf8",
    windowsHide: true,
    ...options,
  });

  return result;
}

function probeDurationSeconds(filePath) {
  const result = runFfmpeg(["-hide_banner", "-i", filePath]);
  const output = `${result.stderr ?? ""}\n${result.stdout ?? ""}`;
  const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(output);

  if (!match) {
    throw new Error(`Could not read MP3 duration from ffmpeg output for ${filePath}`);
  }

  const [, hours, minutes, seconds] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

const duration = probeDurationSeconds(sourcePath);
const sourceLoopStart = Number(process.env.SPACE_BGM_LOOP_START_SECONDS ?? 8);
const sourceLoopEndPadding = Number(process.env.SPACE_BGM_LOOP_END_PADDING_SECONDS ?? 3);
const requestedCrossfade = Number(process.env.SPACE_BGM_CROSSFADE_SECONDS ?? 6);
const loopStartSeconds = Math.max(0, Math.min(sourceLoopStart, duration * 0.25));
const loopEndSeconds = Math.max(loopStartSeconds + 12, duration - sourceLoopEndPadding);
const availableLoopSeconds = Math.max(1, loopEndSeconds - loopStartSeconds);
const crossfadeSeconds = Math.min(
  requestedCrossfade,
  Math.max(1.5, availableLoopSeconds * 0.18),
  Math.max(1.5, (availableLoopSeconds - 2) / 2),
);

if (loopEndSeconds - loopStartSeconds <= crossfadeSeconds * 2 + 1) {
  throw new Error(
    `Source is too short for a seamless loop: duration=${duration.toFixed(2)}s, ` +
      `loopStart=${loopStartSeconds.toFixed(2)}s, loopEnd=${loopEndSeconds.toFixed(2)}s, ` +
      `crossfade=${crossfadeSeconds.toFixed(2)}s`,
  );
}

const fmt = (value) => value.toFixed(3);
const bodyStart = loopStartSeconds + crossfadeSeconds;
const bodyEnd = loopEndSeconds - crossfadeSeconds;
const tailStart = loopEndSeconds - crossfadeSeconds;
const headEnd = loopStartSeconds + crossfadeSeconds;

// Game BGM usually loops an intentionally chosen segment instead of the whole
// song file. This renders body + crossfade(tail, head), so the encoded file can
// use a normal audio loop without an audible tail fade or hard jump at the seam.
const filter = [
  `[0:a]atrim=start=${fmt(bodyStart)}:end=${fmt(bodyEnd)},asetpts=PTS-STARTPTS,volume=0.72[body]`,
  `[0:a]atrim=start=${fmt(tailStart)}:end=${fmt(loopEndSeconds)},asetpts=PTS-STARTPTS,volume=0.72[tail]`,
  `[0:a]atrim=start=${fmt(loopStartSeconds)}:end=${fmt(headEnd)},asetpts=PTS-STARTPTS,volume=0.72[head]`,
  `[tail][head]acrossfade=d=${fmt(crossfadeSeconds)}:c1=tri:c2=tri[seam]`,
  "[body][seam]concat=n=2:v=0:a=1[out]",
].join(";");

const result = runFfmpeg([
  "-y",
  "-hide_banner",
  "-i",
  sourcePath,
  "-vn",
  "-map_metadata",
  "-1",
  "-filter_complex",
  filter,
  "-map",
  "[out]",
  "-codec:a",
  "libmp3lame",
  "-b:a",
  "160k",
  "-ar",
  "44100",
  outputPath,
]);

if (result.status !== 0) {
  throw new Error(result.stderr || `ffmpeg exited with code ${result.status}`);
}

console.log(
  JSON.stringify(
    {
      source: sourcePath,
      output: outputPath,
      durationSeconds: Number(duration.toFixed(2)),
      loopStartSeconds: Number(loopStartSeconds.toFixed(2)),
      loopEndSeconds: Number(loopEndSeconds.toFixed(2)),
      crossfadeSeconds: Number(crossfadeSeconds.toFixed(2)),
      renderedLoopSeconds: Number((bodyEnd - bodyStart + crossfadeSeconds).toFixed(2)),
      fileSizeBytes: fs.statSync(outputPath).size,
    },
    null,
    2,
  ),
);
