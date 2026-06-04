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

function footstepClick(sr) {
  const n = Math.floor(sr * 0.06);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.sin(Math.PI * t) ** 2;
    out[i] = (Math.random() * 2 - 1) * env * 0.55;
  }
  return out;
}

const sr = 44100;

writeWav(join(root, "audio/ambient_architecture.wav"), {
  sampleRate: sr,
  samples: noiseAmbient(sr, 4),
});
writeWav(join(root, "audio/footstep_01.wav"), { sampleRate: sr, samples: footstepClick(sr) });
writeWav(join(root, "audio/footstep_02.wav"), {
  sampleRate: sr,
  samples: footstepClick(sr).map((v, i, arr) => v * (0.85 + 0.15 * (i / arr.length))),
});
console.log("Wrote placeholder WAV under apps/web/public/audio/");
console.log("Exhibit audio: place public/media/<exhibitId>.mp3 (e.g. demo_box.mp3)");
