import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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

test("rapid same-work reentry starts a fresh Focus session and ignores the stale close", async () => {
  const {
    createInitialSpaceFocusSessionState,
    reduceSpaceFocusSession,
  } = await loadGate();
  assert.equal(
    typeof createInitialSpaceFocusSessionState,
    "function",
    "Focus lifecycle state must expose an initial session factory",
  );
  assert.equal(
    typeof reduceSpaceFocusSession,
    "function",
    "Focus lifecycle state must expose a reducer",
  );

  const exhibit = { exhibitId: "arch_treehabitat" };
  let state = createInitialSpaceFocusSessionState();
  state = reduceSpaceFocusSession(state, {
    type: "route-sync",
    entered: true,
    focused: exhibit,
  });
  const firstSessionId = state.current?.sessionId;
  assert.equal(state.current?.phase, "active");

  state = reduceSpaceFocusSession(state, {
    type: "begin-dismiss",
    sessionId: firstSessionId,
  });
  assert.equal(state.current?.phase, "closing");

  state = reduceSpaceFocusSession(state, {
    type: "route-sync",
    entered: true,
    focused: exhibit,
  });
  const secondSessionId = state.current?.sessionId;
  assert.equal(state.current?.phase, "active");
  assert.notEqual(secondSessionId, firstSessionId);

  state = reduceSpaceFocusSession(state, {
    type: "finish-dismiss",
    sessionId: firstSessionId,
  });
  assert.equal(state.current?.sessionId, secondSessionId);
  assert.equal(state.current?.phase, "active");
});

test("the desktop Focus owner mounts each lifecycle session independently", () => {
  const experience = readFileSync(
    new URL("../../src/pages/SpaceDesktopExperience.tsx", import.meta.url),
    "utf8",
  );
  const overlay = readFileSync(
    new URL("../../src/exhibits/FocusOverlay.tsx", import.meta.url),
    "utf8",
  );

  assert.match(experience, /reduceSpaceFocusSession/);
  assert.match(experience, /useLocation\(\)/);
  assert.match(experience, /\[entered,\s*focused,\s*location\]/);
  assert.match(experience, /key=\{`\$\{[^}]*exhibitId\}:\$\{[^}]*sessionId\}`\}/);
  assert.match(experience, /type:\s*["']finish-dismiss["'][\s\S]*?sessionId/);
  assert.match(overlay, /closeVisualTimerRef/);
  assert.match(overlay, /closeCompleteTimerRef/);
  assert.match(overlay, /clearTimeout\(closeVisualTimerRef\.current\)/);
  assert.match(overlay, /clearTimeout\(closeCompleteTimerRef\.current\)/);
});
