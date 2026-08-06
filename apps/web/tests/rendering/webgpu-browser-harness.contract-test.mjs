import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { repoRoot } from "../helpers/projectPaths.mjs";

const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const readHarness = (name) => readFileSync(
  resolve(repoRoot, "apps/web/tests/browser", name),
  "utf8",
);

test("release gates retain the strict WebGPU browser harness contract", () => {
  assert.equal(
    packageJson.scripts["test:webgpu-browser-contract"],
    "node --test apps/web/tests/rendering/webgpu-browser-harness.contract-test.mjs",
  );
  assert.match(
    packageJson.scripts["test:release-gates"],
    / && npm run test:webgpu-browser-contract$/,
  );
});

test("strict harness proves the raw render failure and a rendered WebGL2 fallback", () => {
  const strictHarness = readHarness("space-webgpu-strict-entrypoint.html");

  assert.match(strictHarness, /new WebGPURenderer\(\{ canvas: controlCanvas \}\)/);
  assert.match(strictHarness, /controlRenderer\.render\(control\.scene, control\.camera\)/);
  assert.match(strictHarness, /controlError\?\.message !== strictEntryPointMessage/);
  assert.match(strictHarness, /createWebGPURenderer\(\{ canvas \}\)/);
  assert.match(strictHarness, /renderer\.render\(fallback\.scene, fallback\.camera\)/);
  assert.match(strictHarness, /backend !== "webgl2"/);
});

test("diagnostic harness compares implicit and explicit entryPoint descriptors", () => {
  const diagnostics = readHarness("webgpu-entrypoint-compat.html");

  assert.match(diagnostics, /vertex: \{ module \},/);
  assert.match(diagnostics, /vertex: \{ module, entryPoint: "mainVS" \},/);
  assert.match(diagnostics, /fragment: \{[\s\S]*entryPoint: "mainFS"/);
  assert.match(diagnostics, /pushErrorScope\("validation"\)/);
});
