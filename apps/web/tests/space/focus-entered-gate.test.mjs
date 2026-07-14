import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const gateUrl = new URL("../../src/space/spaceFocusSurfaceState.ts", import.meta.url);

async function loadGate() {
  assert.equal(existsSync(gateUrl), true, "the focus surface entered gate must exist");
  return import(gateUrl.href);
}

test("work URL state stays pending without mounting any focus surface before entered", async () => {
  const { resolveSpaceFocusSurfaceState } = await loadGate();
  const focused = { exhibitId: "work-a" };

  assert.deepEqual(
    resolveSpaceFocusSurfaceState({
      entered: false,
      focused,
      focusClosing: null,
      focusedRoutePending: true,
      onboardingFocusOpen: true,
      onboardingFocusClosing: false,
    }),
    {
      focusOverlayExhibit: null,
      invalidFocusedRoute: false,
      onboardingFocusVisible: false,
      focusSurfaceOpen: false,
    },
  );
});

test("the same resolved work becomes visible after the main runtime enters", async () => {
  const { resolveSpaceFocusSurfaceState } = await loadGate();
  const focused = { exhibitId: "work-a" };

  assert.deepEqual(
    resolveSpaceFocusSurfaceState({
      entered: true,
      focused,
      focusClosing: null,
      focusedRoutePending: false,
      onboardingFocusOpen: false,
      onboardingFocusClosing: false,
    }),
    {
      focusOverlayExhibit: focused,
      invalidFocusedRoute: false,
      onboardingFocusVisible: false,
      focusSurfaceOpen: true,
    },
  );
});

test("invalid work and onboarding surfaces are also absent until entered", async () => {
  const { resolveSpaceFocusSurfaceState } = await loadGate();
  const pending = {
    focused: null,
    focusClosing: null,
    focusedRoutePending: true,
    onboardingFocusOpen: false,
    onboardingFocusClosing: true,
  };

  assert.equal(resolveSpaceFocusSurfaceState({ entered: false, ...pending }).focusSurfaceOpen, false);
  assert.deepEqual(resolveSpaceFocusSurfaceState({ entered: true, ...pending }), {
    focusOverlayExhibit: null,
    invalidFocusedRoute: true,
    onboardingFocusVisible: true,
    focusSurfaceOpen: true,
  });
});
