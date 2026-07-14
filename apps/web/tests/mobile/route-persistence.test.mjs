import assert from "node:assert/strict";
import { createElement, useEffect, useRef } from "react";
import { act, create } from "react-test-renderer";
import test from "node:test";
import { PersistentMobileExperienceBoundary } from "../../src/mobile/PersistentMobileExperienceBoundary.ts";
import { resolveMobileRouteView } from "../../src/mobile/mobileRouteView.ts";

test("one mobile experience preserves mount and boot state across canonical route history", async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const originalConsoleError = console.error;
  console.error = (message, ...rest) => {
    if (String(message).includes("react-test-renderer is deprecated")) return;
    originalConsoleError(message, ...rest);
  };
  let mounts = 0;
  let unmounts = 0;
  let bootStarts = 0;

  function ProbeExperience({ view }) {
    const bootIdentity = useRef(++bootStarts);
    useEffect(() => {
      mounts += 1;
      return () => { unmounts += 1; };
    }, []);
    return createElement("mobile-experience", { bootIdentity: bootIdentity.current, view });
  }

  const renderRoute = (route) => createElement(PersistentMobileExperienceBoundary, {
    experience: createElement(ProbeExperience, { view: resolveMobileRouteView(route) }),
  });

  try {
    let renderer;
    await act(() => { renderer = create(renderRoute({ kind: "space" })); });
    const bootIdentity = renderer.root.findByType("mobile-experience").props.bootIdentity;
    for (const route of [
      { kind: "work", exhibitId: "arch_treehabitat" },
      { kind: "profile" },
      { kind: "work", exhibitId: "arch_treehabitat" },
      { kind: "space-alias" },
      { kind: "profile-alias" },
      { kind: "space" },
    ]) {
      await act(() => { renderer.update(renderRoute(route)); });
      const probe = renderer.root.findByType("mobile-experience");
      assert.equal(probe.props.bootIdentity, bootIdentity);
      assert.equal(mounts, 1);
      assert.equal(unmounts, 0);
    }
    assert.deepEqual(resolveMobileRouteView({ kind: "profile" }), { kind: "profile" });
    assert.deepEqual(resolveMobileRouteView({ kind: "space-alias" }), { kind: "root" });
    assert.deepEqual(resolveMobileRouteView({ kind: "profile-alias" }), { kind: "profile" });
    assert.deepEqual(resolveMobileRouteView({ kind: "work", exhibitId: "arch_treehabitat" }), {
      kind: "work",
      projectId: "arch_treehabitat",
    });
    await act(() => { renderer.unmount(); });
  } finally {
    console.error = originalConsoleError;
  }
});
