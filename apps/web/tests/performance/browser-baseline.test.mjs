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

test("selected-work transfer classification includes particle caches on every deployment base", async () => {
  const { isSelectedWorkRequest, classifyRequestUrl } = await import(harnessUrl);
  for (const base of ["http://localhost", "https://example.com/lizzardkevin-space"]) {
    for (const path of ["/particles/arch_treehabitat.particles.bin?v=1", "/exhibits/arch_treehabitat/content.json", "/exhibits/arch_treehabitat/img/1.webp", "/exhibits/arch_treehabitat/focus_tree.glb"]) {
      assert.equal(isSelectedWorkRequest(`${base}${path}`), true, path);
    }
    assert.equal(isSelectedWorkRequest(`${base}/particles/arch_uabb.particles.bin`), false);
    assert.equal(isSelectedWorkRequest(`${base}/particles/arch_treehabitat.particles.bin.other`), false);
    assert.deepEqual(classifyRequestUrl(`${base}/particles/arch_treehabitat.particles.bin`), {
      threeDimensional: true, preEnterForbidden: true, persistentCore: false,
    });
  }
});

test("desktop journey targets the current archive and work pages with route return controls", () => {
  const source = readFileSync(harness, "utf8");
  assert.doesNotMatch(source, /focus-overlay|focus-media-dot|focus-return-button|frosted-split|\.nth\(/);
  assert.equal(source.match(/await waitForWorkParticleState\(audit\.page\)/g)?.length, 2);
  assert.match(source, /name: "LizzardKevin", exact: true/);
  assert.match(source, /name: "DevStories", exact: true/);
  assert.match(source, /waitForSelector\("\.ark-hub"/);
  assert.equal(source.match(/waitForSelector\("#work-hero"/g)?.length, 2);
  assert.equal(source.match(/waitForSelector\("#work-gallery img"/g)?.length, 2);
  assert.equal(source.match(/name: \/Back to SPACE\|返回 SPACE\//g)?.length, 2);
});

test("split Three core vendor chunks remain forbidden on cold content and mobile", async () => {
  const { classifyRequestUrl } = await import(harnessUrl);
  assert.equal(classifyRequestUrl("https://example.com/lizzardkevin-space/assets/three-core-vendor-abc123.js").threeDimensional, true);
});

test("work readiness wait stays pending until an explicit renderer success or fallback", async () => {
  const { readWorkParticleState, waitForWorkParticleState } = await import(harnessUrl);
  const previousDocument = globalThis.document;
  let ready = false, failed = false;
  globalThis.document = { querySelector: (selector) => selector.includes('"failed"') ? failed : ready };
  try {
    assert.equal(readWorkParticleState(), null);
    let resolveSignal;
    const signal = new Promise((resolve) => { resolveSignal = resolve; });
    let completed = false;
    const waiting = waitForWorkParticleState({
      async waitForFunction(predicate, argument, options) {
        assert.equal(argument, null);
        assert.equal(options.timeout, 90_000);
        assert.equal(predicate(), null);
        await signal;
        return { jsonValue: async () => predicate() };
      },
    }).then((state) => { completed = true; return state; });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(completed, false, "a mounted work page does not imply particle readiness");
    ready = true;
    resolveSignal();
    assert.equal(await waiting, "ready");
    ready = false;
    failed = true;
    assert.equal(readWorkParticleState(), "failed");
  } finally {
    globalThis.document = previousDocument;
  }
});
