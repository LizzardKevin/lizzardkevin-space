import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { generatedExhibitLabels } from "../../src/generated/exhibitLabels.generated.ts";
import { isKnownExhibitId, knownExhibitIds } from "../../src/content/lightweightExhibitIndex.ts";
import { resolveAppRoute, workRoute } from "../../src/app/routeConfig.ts";

test("cold work validation uses the lightweight exhibit index", () => {
  assert.equal(isKnownExhibitId("arch_treehabitat"), true);
  assert.equal(isKnownExhibitId("arch_uabb_exhibit"), true);
  assert.equal(isKnownExhibitId("missing-work"), false);
});

test("the cold route index derives from generated labels without importing 3D runtime", () => {
  const generatedIds = Object.keys(generatedExhibitLabels).filter((id) => id !== "space_onboarding_demo");
  assert.deepEqual(knownExhibitIds, generatedIds);
  const source = readFileSync(new URL("../../src/content/lightweightExhibitIndex.ts", import.meta.url), "utf8");
  assert.match(source, /generatedExhibitLabels/);
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
  assert.doesNotThrow(() => resolveAppRoute("/works/%E0%A4%A"));
  assert.deepEqual(resolveAppRoute("/works/%E0%A4%A"), { kind: "not-found" });
});
