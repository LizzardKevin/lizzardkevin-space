import fs from "node:fs";
import path from "node:path";

const glbPath = path.resolve("apps/web/public/models/space_main.glb");

const anchors = [];

function paddedJsonBuffer(json) {
  const jsonText = JSON.stringify(json);
  const padding = (4 - (Buffer.byteLength(jsonText) % 4)) % 4;
  return Buffer.from(jsonText + " ".repeat(padding), "utf8");
}

function readGlb(filePath) {
  const data = fs.readFileSync(filePath);
  if (data.toString("utf8", 0, 4) !== "glTF") {
    throw new Error(`${filePath} is not a GLB file`);
  }

  const jsonLength = data.readUInt32LE(12);
  const jsonType = data.toString("utf8", 16, 20);
  if (jsonType !== "JSON") {
    throw new Error(`${filePath} first chunk is not JSON`);
  }

  const json = JSON.parse(data.toString("utf8", 20, 20 + jsonLength));
  const remaining = data.subarray(20 + jsonLength);
  return { json, remaining };
}

function upsertAnchor(json, anchor) {
  json.nodes ??= [];
  json.scenes ??= [{ nodes: [] }];
  json.scene ??= 0;
  json.scenes[json.scene].nodes ??= [];

  let nodeIndex = json.nodes.findIndex((node) => node.name === anchor.name);
  if (nodeIndex === -1) {
    nodeIndex = json.nodes.length;
    json.nodes.push({ name: anchor.name, translation: anchor.translation });
  } else {
    json.nodes[nodeIndex] = {
      ...json.nodes[nodeIndex],
      name: anchor.name,
      translation: anchor.translation,
    };
    delete json.nodes[nodeIndex].mesh;
  }

  if (!json.scenes[json.scene].nodes.includes(nodeIndex)) {
    json.scenes[json.scene].nodes.push(nodeIndex);
  }
}

function writeGlb(filePath, json, remaining) {
  const jsonBuffer = paddedJsonBuffer(json);
  const header = Buffer.alloc(20);
  header.write("glTF", 0, "utf8");
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + jsonBuffer.length + remaining.length, 8);
  header.writeUInt32LE(jsonBuffer.length, 12);
  header.write("JSON", 16, "utf8");
  fs.writeFileSync(filePath, Buffer.concat([header, jsonBuffer, remaining]));
}

const { json, remaining } = readGlb(glbPath);
for (const anchor of anchors) upsertAnchor(json, anchor);
writeGlb(glbPath, json, remaining);

console.log(JSON.stringify({ glbPath, anchors }, null, 2));
