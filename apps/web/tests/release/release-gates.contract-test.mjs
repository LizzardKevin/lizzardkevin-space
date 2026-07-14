import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const scripts = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8")).scripts;

test("the release gate runs every approved automated phase in order", () => {
  assert.equal(
    scripts["verify:release"],
    [
      "npm run verify:quick",
      "npm run build:chunks",
      "npm run build:github-pages:chunks",
      "npm run asset:check",
      "npm run test:asset-readonly",
      "npm run package:test",
      "npm audit",
    ].join(" && "),
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
