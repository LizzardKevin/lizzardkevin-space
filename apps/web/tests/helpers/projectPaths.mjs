import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const testsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const webRoot = path.resolve(testsRoot, "..");
export const repoRoot = path.resolve(webRoot, "../..");
export const srcRoot = path.join(webRoot, "src");
export const publicRoot = path.join(webRoot, "public");

export function projectPath(...segments) {
  return path.join(repoRoot, ...segments);
}

export function webPath(...segments) {
  return path.join(webRoot, ...segments);
}

export function sourcePath(...segments) {
  return path.join(srcRoot, ...segments);
}

export function publicPath(...segments) {
  return path.join(publicRoot, ...segments);
}

export function readProjectFile(...segments) {
  const filePath = projectPath(...segments);
  assert(existsSync(filePath), `${segments.join("/")} must exist`);
  return readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
}

export function readWebFile(...segments) {
  const filePath = webPath(...segments);
  assert(existsSync(filePath), `${segments.join("/")} must exist`);
  return readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
}

export function readSourceFile(...segments) {
  const filePath = sourcePath(...segments);
  assert(existsSync(filePath), `src/${segments.join("/")} must exist`);
  return readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
}

export function readOptionalProjectFile(...segments) {
  try {
    return readProjectFile(...segments);
  } catch {
    return "";
  }
}

export async function importSourceModule(...segments) {
  return import(pathToFileURL(sourcePath(...segments)).href);
}
