import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const scripts = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8")).scripts;
const wrapperPath = resolve(repoRoot, "scripts/run-protected-release-gates.mjs");

async function loadWrapper() {
  try {
    return await import(pathToFileURL(wrapperPath).href);
  } catch (error) {
    assert.fail(`release-scope protected-byte wrapper must be importable: ${error}`);
  }
}

test("the release gate runs every approved automated phase in order", () => {
  assert.equal(
    scripts["verify:release"],
    [
      "npm run verify:quick",
      "npm run verify:release:protected",
      "npm audit",
    ].join(" && "),
  );
  assert.equal(
    scripts["verify:release:protected"],
    "node scripts/run-protected-release-gates.mjs",
  );
  assert.equal(
    scripts["test:release-gates"],
    "node --test apps/web/tests/release/release-gates.contract-test.mjs",
  );
  assert.match(scripts["verify:quick"], / && npm run test:release-gates$/);
});

test("release chunk builds validate content without running mutating generators", () => {
  assert.equal(
    scripts["build:chunks"],
    "npm run content:check && npm run build -w apps/web && node apps/web/tests/build/chunks.contract-test.mjs",
  );
  assert.equal(
    scripts["build:github-pages:chunks"],
    "npm run content:check && npm run build -w apps/web -- --base=/lizzardkevin-space/ && node scripts/prepare-github-pages-dist.mjs && node apps/web/tests/build/chunks.contract-test.mjs",
  );

  for (const name of ["build:chunks", "build:github-pages:chunks"]) {
    assert.doesNotMatch(scripts[name], /content:generate|exhibits:cache/);
  }
});

test("one release-scope snapshot owns the mutating-capable gate sequence", async () => {
  const { PROTECTED_RELEASE_GATES, runProtectedReleaseGates } = await loadWrapper();
  const expectedGates = [
    "build:chunks",
    "build:github-pages:chunks",
    "asset:check",
    "package:test",
  ];
  assert.deepEqual(PROTECTED_RELEASE_GATES, expectedGates);

  const fixtureRoot = mkdtempSync(resolve(tmpdir(), "space-release-gates-"));
  const protectedRoot = "protected";
  mkdirSync(resolve(fixtureRoot, protectedRoot));
  writeFileSync(resolve(fixtureRoot, protectedRoot, "asset.bin"), "original");

  try {
    const calls = [];
    runProtectedReleaseGates({
      repoRoot: fixtureRoot,
      protectedRoots: [protectedRoot],
      runGate: (name) => calls.push(name),
    });
    assert.deepEqual(calls, expectedGates);
    assert.equal(calls.filter((name) => name === "asset:check").length, 1);

    const mutatingCalls = [];
    assert.throws(
      () =>
        runProtectedReleaseGates({
          repoRoot: fixtureRoot,
          protectedRoots: [protectedRoot],
          runGate: (name) => {
            mutatingCalls.push(name);
            if (name === "build:chunks") {
              writeFileSync(resolve(fixtureRoot, protectedRoot, "asset.bin"), "mutated");
            }
          },
        }),
      /protected assets changed during npm run build:chunks.*protected\/asset\.bin/is,
    );
    assert.deepEqual(mutatingCalls, ["build:chunks"]);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
