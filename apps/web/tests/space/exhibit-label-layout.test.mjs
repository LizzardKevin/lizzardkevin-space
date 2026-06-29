import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

test("exhibit target labels clamp projected screen points inside the viewport", async () => {
  const layout = await importSourceModule("exhibits/exhibitTargetLabelLayout.ts");
  const viewport = { width: 1920, height: 1080 };

  assert.deepEqual(
    layout.clampExhibitLabelScreenPoint({ x: -140, y: 24 }, viewport, 32, { width: 180, height: 40 }),
    { x: 122, y: 52 },
  );
  assert.deepEqual(
    layout.clampExhibitLabelScreenPoint({ x: 2180, y: 1220 }, viewport, 32, { width: 180, height: 40 }),
    { x: 1798, y: 1028 },
  );
  assert.deepEqual(
    layout.clampExhibitLabelScreenPoint({ x: 960, y: 540 }, viewport, 32),
    { x: 960, y: 540 },
  );
});
