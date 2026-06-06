/**
 * 生成占位 WAV（无需 ffmpeg）。运行：node apps/web/scripts/generate-placeholder-audio.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "../../public");

function writeWav(filePath, { sampleRate, samples }) {
  mkdirSync(dirname(filePath), { recursive: true });
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.floor(v * 32767), 44 + i * 2);
  }
  writeFileSync(filePath, buffer);
}

function noiseAmbient(sr, seconds) {
  const n = Math.floor(sr * seconds);
  const out = new Float32Array(n);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.015 * white) / 1.015;
    out[i] = last * 0.12;
  }
  return out;
}

/** 柔和室内单步：低频闷响 + 轻摩擦，避免尖锐噪点。 */
function indoorFootstep(sr, variant) {
  const seconds = 0.16;
  const n = Math.floor(sr * seconds);
  const out = new Float32Array(n);
  const thumpHz = variant === 0 ? 88 : 102;
  const thumpGain = variant === 0 ? 0.2 : 0.17;
  let brown = 0;

  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const attack = 1 - Math.exp(-t * 140);
    const decay = Math.exp(-t * 22);
    const env = attack * decay;
    const white = Math.random() * 2 - 1;
    brown = (brown + 0.012 * white) / 1.012;
    const thump = Math.sin(2 * Math.PI * thumpHz * t) * Math.exp(-t * 30);
    const fabric = brown * 0.045;
    out[i] = (thump * thumpGain + fabric) * env;
  }

  let lp = 0;
  for (let i = 0; i < n; i++) {
    lp += 0.12 * (out[i] - lp);
    out[i] = lp * 0.72;
  }
  return out;
}

const sr = 44100;

writeWav(join(root, "audio/ambient_architecture.wav"), {
  sampleRate: sr,
  samples: noiseAmbient(sr, 4),
});
writeWav(join(root, "audio/footstep_01.wav"), { sampleRate: sr, samples: indoorFootstep(sr, 0) });
writeWav(join(root, "audio/footstep_02.wav"), { sampleRate: sr, samples: indoorFootstep(sr, 1) });
writeWav(join(root, "audio/footstep_03.wav"), {
  sampleRate: sr,
  samples: indoorFootstep(sr, 0).map((v, i, arr) => v * (0.92 + 0.08 * (i / arr.length))),
});

console.log("Wrote placeholder WAV under apps/web/public/audio/");
console.log("Exhibit audio: place public/media/<exhibitId>.mp3 (e.g. demo_box.mp3)");
