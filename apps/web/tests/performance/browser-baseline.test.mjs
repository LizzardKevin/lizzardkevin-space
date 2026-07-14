import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const harness = resolve(repoRoot, "scripts/measure-space-browser-performance.mjs");
const harnessUrl = pathToFileURL(harness).href;

test("browser performance harness is explicitly wired but kept outside release gates", () => {
  const scripts = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8")).scripts;
  const source = readFileSync(harness, "utf8");
  assert(existsSync(harness), "scripts/measure-space-browser-performance.mjs must exist");
  assert.equal(
    scripts["performance:browser"],
    "node scripts/measure-space-browser-performance.mjs",
  );
  assert.equal(
    scripts["test:browser-baseline"],
    "node --test apps/web/tests/performance/browser-baseline.test.mjs",
  );
  assert.doesNotMatch(scripts["verify:quick"], /performance:browser/);
  assert.doesNotMatch(scripts["verify:release"], /performance:browser/);
  assert.match(source, /type === "mobile"[\s\S]*?hasTouch:\s*true/);
  assert.match(source, /type === "mobile"[\s\S]*?isMobile:\s*true/);
  assert.match(source, /repeatedWorkReturnViaUi/);
  assert.match(source, /if \(!repeatedWorkReturnViaUi\)[\s\S]*?navigateSpa\(audit\.page, "\/"\)/);
  assert.match(source, /--source-git-head/);
});

test("sample summaries use median, range, and nearest-rank p95 without hiding dispersion", async () => {
  const { summarizeNumbers } = await import(harnessUrl);
  assert.deepEqual(summarizeNumbers([40, 10, 30, 20]), {
    count: 4,
    min: 10,
    max: 40,
    median: 25,
    p95: 40,
  });
  assert.deepEqual(summarizeNumbers([12, 11, 10]), {
    count: 3,
    min: 10,
    max: 12,
    median: 11,
    p95: 12,
  });
  assert.equal(summarizeNumbers([]), null);
});

test("request classification distinguishes all 3D, pre-Enter, and persistent core costs", async () => {
  const { classifyRequestUrl } = await import(harnessUrl);
  assert.deepEqual(classifyRequestUrl("http://localhost/assets/rapier-vendor-abc.js"), {
    threeDimensional: true,
    preEnterForbidden: true,
    persistentCore: true,
  });
  assert.deepEqual(classifyRequestUrl("http://localhost/models/space_main.glb"), {
    threeDimensional: true,
    preEnterForbidden: true,
    persistentCore: true,
  });
  assert.deepEqual(classifyRequestUrl("http://localhost/exhibits/a/focus_a.glb"), {
    threeDimensional: true,
    preEnterForbidden: true,
    persistentCore: false,
  });
  assert.deepEqual(classifyRequestUrl("http://localhost/exhibits/a/img/1.webp"), {
    threeDimensional: false,
    preEnterForbidden: false,
    persistentCore: false,
  });
});

test("hard-gate evaluation reports exact violating URLs and route re-request deltas", async () => {
  const { evaluateHardGates } = await import(harnessUrl);
  assert.deepEqual(
    evaluateHardGates({
      mobileSamples: [{ threeDimensionalUrls: [] }],
      coldContentSamples: [{ threeDimensionalUrls: ["/assets/three-vendor.js"] }],
      lobbySamples: [{ preEnterForbiddenUrls: [] }],
      routeSamples: [{ persistentCoreReRequestCount: 1 }],
    }),
    {
      mobileAndColdContent3dZero: {
        pass: false,
        violations: ["/assets/three-vendor.js"],
      },
      desktopLobbyPreEnterForbiddenZero: { pass: true, violations: [] },
      routeReturnCoreReRequestsZero: { pass: false, observed: 1 },
    },
  );
});

test("scenario metric summaries retain nested measurements and ignore unavailable values", async () => {
  const { summarizeMetric } = await import(harnessUrl);
  const samples = [
    { network: { encodedBytes: 100 } },
    { network: { encodedBytes: 300 } },
    { network: { encodedBytes: null } },
    { network: { encodedBytes: 200 } },
  ];
  assert.deepEqual(summarizeMetric(samples, "network.encodedBytes"), {
    count: 3,
    min: 100,
    max: 300,
    median: 200,
    p95: 300,
  });
  assert.equal(summarizeMetric(samples, "gpu.bytes"), null);
});

test("shipping asset comparison ignores build chunks but rejects byte or hash drift", async () => {
  const { compareShippingAssets } = await import(harnessUrl);
  const baseline = { assets: [
    { path: "apps/web/public/a.glb", shipping: true, bytes: 10, sha256: "aaa" },
    { path: "BlenderFile/a.blend", shipping: false, bytes: 20, sha256: "bbb" },
  ] };
  assert.deepEqual(compareShippingAssets(baseline, baseline), { pass: true, violations: [] });
  assert.deepEqual(
    compareShippingAssets(baseline, { assets: [
      { path: "apps/web/public/a.glb", shipping: true, bytes: 11, sha256: "ccc" },
    ] }),
    { pass: false, violations: ["apps/web/public/a.glb"] },
  );
});
