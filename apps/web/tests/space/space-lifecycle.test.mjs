import assert from "node:assert/strict";
import test from "node:test";
import {
  INITIAL_ENTRY_TRANSITION_STATE,
  reduceEntryTransitionState,
} from "../../src/entry/entryTransitionState.ts";
import {
  completeEntryAfterHostReady,
  createPersistentHostLifecycle,
} from "../../src/space/persistentHostLifecycle.ts";
import { resolveSpaceRouteRuntimePolicy } from "../../src/space/routeRuntimePolicy.ts";

test("trusted Enter stays covered until real readiness and splash transition completion", () => {
  let entry = INITIAL_ENTRY_TRANSITION_STATE;
  const session = createPersistentHostLifecycle();

  assert.equal(session.started, false);
  assert.equal(session.trustedEnter(), true);
  entry = reduceEntryTransitionState(entry, { type: "begin-loading" });
  assert.deepEqual(entry, { entered: false, fading: false, hideButton: true });

  completeEntryAfterHostReady(() => {
    entry = reduceEntryTransitionState(entry, { type: "start-fade" });
  });
  assert.deepEqual(entry, { entered: false, fading: true, hideButton: true });
  entry = reduceEntryTransitionState(entry, { type: "splash-transition-end" });
  assert.deepEqual(entry, { entered: true, fading: false, hideButton: true });
  assert.equal(entry.entered, true, "onboarding and resume controls become eligible only after fade completion");
});

test("persistent host identity and live pose survive navigate, back, and forward", () => {
  const session = createPersistentHostLifecycle();
  session.trustedEnter();
  const hostIdentity = session.hostIdentity;
  session.recordPose({ position: [4, 1.6, -3], yawRad: 0.7, pitchRad: -0.2 });

  for (const route of ["/", "/works/tree-habitat", "/profile", "/devstories", "/profile", "/"]) {
    session.observeRoute(route);
    assert.equal(session.hostIdentity, hostIdentity);
    assert.deepEqual(session.livePose, {
      position: [4, 1.6, -3],
      yawRad: 0.7,
      pitchRad: -0.2,
    });
  }
});

test("works pauses the main runtime without pausing Focus playback", () => {
  assert.deepEqual(resolveSpaceRouteRuntimePolicy("work"), {
    routeBlocked: true,
    pauseMainAudio: true,
    pauseContentPlayback: false,
  });
  assert.equal(resolveSpaceRouteRuntimePolicy("profile").pauseContentPlayback, false);
  assert.equal(resolveSpaceRouteRuntimePolicy("not-found").pauseContentPlayback, false);

  let pauseCalls = 0;
  for (let identity = 0; identity < 50; identity += 1) {
    const changingPlaybackApi = { identity, pause: () => { pauseCalls += 1; } };
    if (resolveSpaceRouteRuntimePolicy("work").pauseContentPlayback) {
      changingPlaybackApi.pause();
    }
  }
  assert.equal(pauseCalls, 0, "changing playback API identity cannot trigger a coordinator pause loop");
});
