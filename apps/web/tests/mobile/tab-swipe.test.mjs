import assert from "node:assert/strict";
import test from "node:test";
import {
  beginMobileTabSwipe,
  createMobileTabSwipeState,
  resetMobileTabSwipe,
  resolveMobileTabSwipeMove,
  resolveMobileTabSwipeRelease,
  resolveTabSwipeOffset,
  TAB_SWIPE_AXIS_RATIO,
  TAB_SWIPE_EDGE_RESISTANCE,
  TAB_SWIPE_ENGAGE_PX,
  TAB_SWIPE_THRESHOLD_PX,
} from "../../src/mobile/mobileTabSwipe.ts";

test("tab swipe tracks horizontal drags only after the axis lock engages", () => {
  const state = createMobileTabSwipeState();
  beginMobileTabSwipe(state, { pointerId: 1, x: 200, y: 400 });

  assert.deepEqual(resolveMobileTabSwipeMove(state, { x: 196, y: 399, currentIndex: 1, total: 4 }), {
    kind: "idle",
  });

  const engage = resolveMobileTabSwipeMove(state, { x: 200 - TAB_SWIPE_ENGAGE_PX - 4, y: 402, currentIndex: 1, total: 4 });
  assert.equal(engage.kind, "engage");
  assert.equal(engage.kind === "engage" ? engage.offsetX : 0, -(TAB_SWIPE_ENGAGE_PX + 4));

  const track = resolveMobileTabSwipeMove(state, { x: 160, y: 404, currentIndex: 1, total: 4 });
  assert.deepEqual(track, { kind: "track", offsetX: -40 });
});

test("tab swipe locks out the gesture once the vertical axis wins", () => {
  const state = createMobileTabSwipeState();
  beginMobileTabSwipe(state, { pointerId: 1, x: 200, y: 200 });

  const vertical = resolveMobileTabSwipeMove(state, { x: 202, y: 200 + TAB_SWIPE_ENGAGE_PX + 2, currentIndex: 1, total: 4 });
  assert.equal(vertical.kind, "ignore");

  const stillIgnored = resolveMobileTabSwipeMove(state, { x: 120, y: 260, currentIndex: 1, total: 4 });
  assert.equal(stillIgnored.kind, "ignore");

  assert.deepEqual(resolveMobileTabSwipeRelease(state, { currentIndex: 1, total: 4 }), { kind: "idle" });
});

test("tab swipe axis ratio keeps diagonal scrolls on their dominant axis", () => {
  const state = createMobileTabSwipeState();
  beginMobileTabSwipe(state, { pointerId: 1, x: 100, y: 100 });

  const dx = TAB_SWIPE_ENGAGE_PX + 2;
  const dy = Math.ceil(dx / TAB_SWIPE_AXIS_RATIO);
  assert.equal(resolveMobileTabSwipeMove(state, { x: 100 - dx, y: 100 + dy, currentIndex: 1, total: 4 }).kind, "idle");
  assert.equal(resolveMobileTabSwipeMove(state, { x: 100 - dx - 4, y: 100 + dy, currentIndex: 1, total: 4 }).kind, "engage");
});

test("tab swipe resists offsets beyond the first and last tab", () => {
  assert.equal(resolveTabSwipeOffset(90, 0, 4), 90 * TAB_SWIPE_EDGE_RESISTANCE);
  assert.equal(resolveTabSwipeOffset(-90, 3, 4), -90 * TAB_SWIPE_EDGE_RESISTANCE);
  assert.equal(resolveTabSwipeOffset(90, 2, 4), 90);
  assert.equal(resolveTabSwipeOffset(-90, 0, 4), -90);
  assert.equal(resolveTabSwipeOffset(90, 0, 0), 90 * TAB_SWIPE_EDGE_RESISTANCE);
});

test("tab swipe rebounds when released below the threshold and resets state", () => {
  const state = createMobileTabSwipeState();
  beginMobileTabSwipe(state, { pointerId: 1, x: 300, y: 100 });
  resolveMobileTabSwipeMove(state, { x: 300 - (TAB_SWIPE_THRESHOLD_PX - 10), y: 102, currentIndex: 1, total: 4 });

  const release = resolveMobileTabSwipeRelease(state, { currentIndex: 1, total: 4 });
  assert.deepEqual(release, { kind: "rebound", offsetX: -(TAB_SWIPE_THRESHOLD_PX - 10) });
  assert.deepEqual(state, createMobileTabSwipeState());
});

test("tab swipe advances to the adjacent tab past the threshold", () => {
  const state = createMobileTabSwipeState();
  beginMobileTabSwipe(state, { pointerId: 1, x: 300, y: 100 });
  const drag = TAB_SWIPE_THRESHOLD_PX + 24;
  resolveMobileTabSwipeMove(state, { x: 300 - drag, y: 102, currentIndex: 1, total: 4 });

  const release = resolveMobileTabSwipeRelease(state, { currentIndex: 1, total: 4 });
  assert.deepEqual(release, { kind: "advance", direction: "next", nextIndex: 2, offsetX: -drag });

  beginMobileTabSwipe(state, { pointerId: 2, x: 100, y: 100 });
  resolveMobileTabSwipeMove(state, { x: 100 + drag, y: 101, currentIndex: 2, total: 4 });
  assert.deepEqual(resolveMobileTabSwipeRelease(state, { currentIndex: 2, total: 4 }), {
    kind: "advance",
    direction: "prev",
    nextIndex: 1,
    offsetX: drag,
  });
});

test("tab swipe cannot advance past the edges even with a forced offset", () => {
  const state = createMobileTabSwipeState();
  beginMobileTabSwipe(state, { pointerId: 1, x: 0, y: 0 });
  state.axis = "horizontal";
  state.offsetX = TAB_SWIPE_THRESHOLD_PX + 50;
  assert.deepEqual(resolveMobileTabSwipeRelease(state, { currentIndex: 0, total: 4 }), {
    kind: "rebound",
    offsetX: TAB_SWIPE_THRESHOLD_PX + 50,
  });

  beginMobileTabSwipe(state, { pointerId: 1, x: 0, y: 0 });
  state.axis = "horizontal";
  state.offsetX = -(TAB_SWIPE_THRESHOLD_PX + 50);
  assert.deepEqual(resolveMobileTabSwipeRelease(state, { currentIndex: 3, total: 4 }), {
    kind: "rebound",
    offsetX: -(TAB_SWIPE_THRESHOLD_PX + 50),
  });
});

test("tab swipe release stays idle without an active gesture and reset clears state", () => {
  const state = createMobileTabSwipeState();
  assert.deepEqual(resolveMobileTabSwipeRelease(state, { currentIndex: 1, total: 4 }), { kind: "idle" });

  beginMobileTabSwipe(state, { pointerId: 9, x: 10, y: 10 });
  state.axis = "horizontal";
  state.offsetX = 44;
  resetMobileTabSwipe(state);
  assert.deepEqual(state, createMobileTabSwipeState());
});
