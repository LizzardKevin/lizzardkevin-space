import assert from "node:assert/strict";
import test from "node:test";
import { flushSpacePoseOnPageHide } from "../../src/space/spacePosePageHide.ts";

test("pagehide always flushes session pose while daily resume stays gated", () => {
  const calls = [];
  const pose = { position: [1, 2, 3], yawRad: 0.4, pitchRad: -0.1 };
  flushSpacePoseOnPageHide({
    dailyResumeEnabled: false,
    pose,
    writeDaily: () => calls.push("daily"),
    writeSession: () => calls.push("session"),
  });
  assert.deepEqual(calls, ["session"]);

  flushSpacePoseOnPageHide({
    dailyResumeEnabled: true,
    pose,
    writeDaily: () => calls.push("daily"),
    writeSession: () => calls.push("session"),
  });
  assert.deepEqual(calls, ["session", "session", "daily"]);
});
