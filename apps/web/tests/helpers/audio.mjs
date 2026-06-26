import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

export function readMono16WavMetrics(filePath) {
  const data = readFileSync(filePath);
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
