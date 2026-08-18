import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { generatedExhibitLabels } from "../../src/generated/exhibitLabels.generated.ts";
import { isKnownExhibitId, knownExhibitIds } from "../../src/content/lightweightExhibitIndex.ts";
import { matchRoutes } from "react-router-dom";
import {
  resolveAppRoute,
  workRoute,
} from "../../src/app/routeConfig.ts";

test("work route validation uses the lightweight exhibit index", () => {
  assert.equal(isKnownExhibitId("arch_treehabitat"), true);
  assert.equal(isKnownExhibitId("arch_uabb_exhibit"), true);
  assert.equal(isKnownExhibitId("missing-work"), false);
});

test("the work route index derives from generated labels without importing 3D runtime", () => {
  const generatedIds = Object.keys(generatedExhibitLabels);
  assert.deepEqual(knownExhibitIds, generatedIds);
  const source = readFileSync(new URL("../../src/content/lightweightExhibitIndex.ts", import.meta.url), "utf8");
  assert.match(source, /generatedExhibitLabels/);
  assert.doesNotMatch(source, /NON_EXHIBIT_LABEL_IDS|space_onboarding_demo/);
  for (const forbidden of ["three", "@react-three/fiber", "@react-three/rapier", ".glb", "SpaceHost"]) {
    assert.equal(source.includes(forbidden), false);
  }
});

test("the shared resolver accepts the safe exhibit ID domain without decoding", () => {
  const id = "arch_treehabitat";
  assert.equal(workRoute(id), "/works/arch_treehabitat");
  assert.deepEqual(resolveAppRoute(workRoute(id)), { kind: "work", exhibitId: id });
});

test("malformed work route encoding becomes not-found without throwing", () => {
  const pathname = "/works/%E0%A4%A";
  const originalWarn = console.warn;
  console.warn = () => {};
  let route;
  let matches;
  try {
    assert.doesNotThrow(() => resolveAppRoute(pathname));
    route = resolveAppRoute(pathname);
    matches = matchRoutes(
      [
        { id: "work", path: "/works/:exhibitId" },
        { id: "wildcard", path: "*" },
      ],
      pathname,
    );
  } finally {
    console.warn = originalWarn;
  }
  assert.deepEqual(route, { kind: "not-found" });
  assert.equal(matches?.at(-1)?.route.id, "work");
});

test("work detail page is a standalone route with no space-started gate", () => {
  const desktop = readFileSync(new URL("../../src/app/DesktopApp.tsx", import.meta.url), "utf8");
  // /works/:exhibitId 直接渲染 WorkDetailPage，不存在 ColdWorkRoute / spaceStarted 门禁。
  assert.match(desktop, /path=["']\/works\/:exhibitId["'][\s\S]*?<WorkDetailPage\s+onNavigateToSpace=\{navigateToSpace\}\s*\/>/);
  assert.equal(desktop.includes("ColdWorkRoute"), false);
  assert.equal(desktop.includes("resolveDesktopWorkRouteSurface"), false);
  // 详情页自身做 known-id 校验并降级 NotFound。
  const detailHook = readFileSync(new URL("../../src/pages/works/useWorkDetail.ts", import.meta.url), "utf8");
  assert.match(detailHook, /isKnownExhibitId/);
  assert.match(detailHook, /status:\s*["']not-found["']/);
});
