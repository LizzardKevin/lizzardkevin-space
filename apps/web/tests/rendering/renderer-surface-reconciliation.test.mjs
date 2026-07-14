import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { projectPath } from "../helpers/projectPaths.mjs";

const surfaceSlotPath = projectPath("apps/web/src/space/spaceCanvasStatus.ts");

test("renderer generation changes reconcile Focus and loading surfaces in the same update", async () => {
  assert(existsSync(surfaceSlotPath), "the Canvas owner must expose a synchronous surface slot");
  const { SpaceCanvasSurfaceSlot, resolveSpaceCanvasStatus } = await import("../../src/space/spaceCanvasStatus.ts");
  assert.equal(typeof resolveSpaceCanvasStatus, "function");
  const renderSurfaces = (status) => createElement(
    "surfaces",
    { profile: status.profile?.id ?? "unresolved" },
    status.profile ? createElement("focus", { profile: status.profile.id }) : null,
    status.loading ? createElement("loading-status") : null,
  );
  const full = { id: "full" };
  const simplified = { id: "simplified" };
  const fullRuntime = {
    attemptId: 1,
    requestedProfile: "full",
    nonce: 0,
    resolvedProfile: full,
    error: null,
  };
  const fullStatus = resolveSpaceCanvasStatus(fullRuntime, {
    attemptId: 1,
    requestedProfile: "full",
    nonce: 0,
    bootFailed: false,
  });
  const switchingStatus = resolveSpaceCanvasStatus(fullRuntime, {
    attemptId: 1,
    requestedProfile: "simplified",
    nonce: 1,
    bootFailed: false,
  });
  const simplifiedStatus = resolveSpaceCanvasStatus({
    ...fullRuntime,
    requestedProfile: "simplified",
    nonce: 1,
    resolvedProfile: simplified,
  }, {
    attemptId: 1,
    requestedProfile: "simplified",
    nonce: 1,
    bootFailed: false,
  });
  let renderer;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const originalError = console.error;
  console.error = (...args) => {
    if (String(args[0]).includes("react-test-renderer is deprecated")) return;
    originalError(...args);
  };

  try {
    await act(() => {
      renderer = create(createElement(SpaceCanvasSurfaceSlot, {
        status: fullStatus,
        renderSurfaces,
      }));
    });
    assert.equal(renderer.root.findByType("focus").props.profile, "full");
    assert.equal(renderer.root.findAllByType("loading-status").length, 0);

    await act(() => {
      renderer.update(createElement(SpaceCanvasSurfaceSlot, {
        status: switchingStatus,
        renderSurfaces,
      }));
    });
    assert.equal(renderer.root.findAllByType("focus").length, 0);
    assert.equal(renderer.root.findAllByType("loading-status").length, 1);

    await act(() => {
      renderer.update(createElement(SpaceCanvasSurfaceSlot, {
        status: simplifiedStatus,
        renderSurfaces,
      }));
    });
    assert.equal(renderer.root.findByType("focus").props.profile, "simplified");
    assert.equal(renderer.root.findAllByType("loading-status").length, 0);
    await act(() => renderer.unmount());
  } finally {
    console.error = originalError;
  }
});
