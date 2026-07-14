import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const candidatePath = resolve(
  repoRoot,
  "docs/performance/space-browser-candidate-d03f737.json",
);
const baselinePath = resolve(repoRoot, "docs/performance/space-browser-baseline.json");
const expectedGitHead = "d03f7373e4b4ec723c1abb67eb22ff9fc8a4fe18";

function readCandidate() {
  return JSON.parse(readFileSync(candidatePath, "utf8"));
}

function readBaseline() {
  return JSON.parse(readFileSync(baselinePath, "utf8"));
}

test("post-fix candidate report is tied to the exact source and sampling protocol", () => {
  const report = readCandidate();

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.environment.gitHead, expectedGitHead);
  assert.equal(report.environment.sampleCountPerCacheState, 3);
  assert.match(report.environment.baseUrl, /^http:\/\/127\.0\.0\.1:/);

  for (const cacheState of ["cold", "warm"]) {
    assert.equal(report.samples.mobile[cacheState].length, 3);
    assert.equal(report.samples.desktopSimplified[cacheState].length, 3);
    for (const route of ["profile", "devstories", "work"]) {
      assert.equal(report.samples.coldContent[route][cacheState].length, 3);
    }
  }
});

test("candidate report retains hard gates and observable repeated-work return evidence", () => {
  const report = readCandidate();

  for (const gate of [
    "mobileAndColdContent3dZero",
    "desktopLobbyPreEnterForbiddenZero",
    "routeReturnCoreReRequestsZero",
    "protectedShippingAssetHashesBytesUnchanged",
  ]) {
    assert.equal(report.hardGates[gate].pass, true, `${gate} must remain green`);
  }

  const desktopSamples = [
    ...report.samples.desktopSimplified.cold,
    ...report.samples.desktopSimplified.warm,
  ];
  assert.equal(desktopSamples.length, 6);
  for (const sample of desktopSamples) {
    assert.equal(sample.repeatedWorkReturnViaUi, true);
    assert.deepEqual(sample.pageErrors, []);
  }
});

test("candidate report makes the documented frame and heap noise result explicit", () => {
  const baseline = readBaseline();
  const candidate = readCandidate();
  const frameWithinNoise = (baselineMetric, candidateMetric) =>
    candidateMetric.max <=
    baselineMetric.max + Math.max(baselineMetric.max * 0.1, 2);
  const heapWithinNoise = (baselineMetric, candidateMetric) =>
    candidateMetric.max <=
    baselineMetric.max + Math.max(baselineMetric.max * 0.1, 8 * 1024 * 1024);

  for (const cacheState of ["cold", "warm"]) {
    const before = baseline.summaries.desktopSimplified[cacheState];
    const after = candidate.summaries.desktopSimplified[cacheState];

    assert.equal(
      frameWithinNoise(before["steadyRaf.median"], after["steadyRaf.median"]),
      false,
      `${cacheState} steady RAF median regression must remain visible`,
    );
    assert.equal(
      frameWithinNoise(before["steadyRaf.p95"], after["steadyRaf.p95"]),
      cacheState === "warm",
      `${cacheState} steady RAF p95 noise result should remain visible`,
    );
    for (const metric of [
      "heapAfterRepeatedWork.usedJSHeapBytes",
      "heapAfterReturn.usedJSHeapBytes",
    ]) {
      assert.equal(
        heapWithinNoise(before[metric], after[metric]),
        true,
        `${cacheState} ${metric} should stay inside its noise ceiling`,
      );
    }
  }
});
