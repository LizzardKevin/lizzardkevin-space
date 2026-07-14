import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const protectedRoots = ["apps/web/public", "apps/web/src/generated", "BlenderFile", "docs/assets"];

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function snapshot() {
  return Object.fromEntries(
    protectedRoots
      .flatMap((root) => walk(resolve(repoRoot, root)))
      .sort()
      .map((path) => [
        relative(repoRoot, path).replaceAll("\\", "/"),
        `${statSync(path).size}:${createHash("sha256").update(readFileSync(path)).digest("hex")}`,
      ]),
  );
}

test("the actual asset:check command preserves generated, public, source, and workbook bytes", () => {
  const scripts = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8")).scripts;
  assert.doesNotMatch(scripts["asset:check"], /content:generate|exhibits:cache|build:chunks/);
  assert.match(scripts["asset:check"], /npm run content:check && npm run build -w apps\/web/);
  const before = snapshot();
  const npmCli = process.env.npm_execpath;
  assert(npmCli, "npm_execpath must identify the active npm CLI");
  const result = spawnSync(process.execPath, [npmCli, "run", "asset:check"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  assert.equal(result.status, 0, `${result.error ?? ""}\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /> content:check/);
  assert.doesNotMatch(result.stdout, /> prebuild\b|> content:generate\b|> exhibits:cache\b/);
  assert.deepEqual(snapshot(), before);
});
