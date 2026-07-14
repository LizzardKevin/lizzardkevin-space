import assert from "node:assert/strict";
import test from "node:test";
import { isKnownExhibitId } from "../../src/content/lightweightExhibitIndex.ts";
import { resolveAppRoute, workRoute } from "../../src/app/routeConfig.ts";

test("cold work validation uses the lightweight exhibit index", () => {
  assert.equal(isKnownExhibitId("arch_treehabitat"), true);
  assert.equal(isKnownExhibitId("arch_uabb_exhibit"), true);
  assert.equal(isKnownExhibitId("missing-work"), false);
});

test("work route encoding is decoded exactly once by the shared resolver", () => {
  const id = "concept%archive";
  assert.equal(workRoute(id), "/works/concept%25archive");
  assert.deepEqual(resolveAppRoute(workRoute(id)), { kind: "work", exhibitId: id });
});
