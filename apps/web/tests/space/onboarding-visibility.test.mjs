import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readSourceFile } from "../helpers/projectPaths.mjs";

// Execute the actual parent policy, without mounting WebGPU/physics in Node.
function policy(overrides = {}) {
  const source = readSourceFile("pages/SpaceDesktopExperience.tsx");
  const start = source.indexOf("  const isHovering =");
  const end = source.indexOf("  const projectorHintVisible =", start);
  return vm.runInNewContext(`${source.slice(start, end)}; ({ controlsEnabled, onboardingEnabled });`, {
    entered: true, overlay: { isOverlayOpen: false }, routeBlocked: false,
    pointerLockUnavailable: false, dailyResumePose: null, onboardingCompleted: false,
    exhibitTarget: null, ...overrides,
  });
}

test("incomplete onboarding hides on Profile, DevStories and Work and returns unchanged", () => {
  for (const page of ["profile", "devstories", "work"]) {
    assert.equal(policy({ routeBlocked: true, overlay: { isOverlayOpen: true } }).onboardingEnabled, false, page);
    assert.equal(policy().onboardingEnabled, true, `${page} return`);
  }
  assert.equal(policy({ dailyResumePose: {} }).onboardingEnabled, false);
  assert.equal(policy({ onboardingCompleted: true }).onboardingEnabled, false);
});
