import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

export function readGlbJson(filePath) {
  const data = readFileSync(filePath);
  assert.equal(data.toString("utf8", 0, 4), "glTF");
  const jsonLength = data.readUInt32LE(12);
  assert.equal(data.toString("utf8", 16, 20), "JSON");
  return JSON.parse(data.toString("utf8", 20, 20 + jsonLength));
}
