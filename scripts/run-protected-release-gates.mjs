import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRepoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const PROTECTED_ROOTS = Object.freeze([
  "apps/web/public",
  "apps/web/src/generated",
  "BlenderFile",
  "docs/assets",
]);

export const PROTECTED_RELEASE_GATES = Object.freeze([
  "build:chunks",
  "build:github-pages:chunks",
  "asset:check",
  "package:test",
]);

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

export function createProtectedSnapshot({ repoRoot, protectedRoots }) {
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

function changedPaths(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .sort()
    .filter((path) => before[path] !== after[path]);
}

function runNpmGate(name, repoRoot) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error("npm_execpath must identify the active npm CLI");
  }

  const result = spawnSync(process.execPath, [npmCli, "run", name], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm run ${name} failed with status ${result.status ?? "unknown"}`);
  }
}

export function runProtectedReleaseGates({
  repoRoot = defaultRepoRoot,
  protectedRoots = PROTECTED_ROOTS,
  gates = PROTECTED_RELEASE_GATES,
  runGate = (name) => runNpmGate(name, repoRoot),
} = {}) {
  const before = createProtectedSnapshot({ repoRoot, protectedRoots });

  for (const gate of gates) {
    let gateError;
    try {
      runGate(gate);
    } catch (error) {
      gateError = error;
    }

    const changes = changedPaths(
      before,
      createProtectedSnapshot({ repoRoot, protectedRoots }),
    );
    if (changes.length > 0) {
      throw new Error(
        `Protected assets changed during npm run ${gate}:\n${changes.join("\n")}`,
        gateError ? { cause: gateError } : undefined,
      );
    }
    if (gateError) throw gateError;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runProtectedReleaseGates();
  } catch (error) {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  }
}
