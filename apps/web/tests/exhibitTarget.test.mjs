import assert from "node:assert/strict";
import test from "node:test";

test("Tree Habitat uses its reader-facing exhibit title", async () => {
  const { formatExhibitLabel } = await import("../src/exhibits/exhibitTarget.ts");

  assert.equal(formatExhibitLabel("arch_treehabitat"), "Tree Habitat");
});
