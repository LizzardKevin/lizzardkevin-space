import assert from "node:assert/strict";
import test from "node:test";

test("focus media rail loops through model and exhibit images", async () => {
  const { getFocusMediaItems, nextFocusMediaIndex, resolveFocusMediaDragStep } = await import(
    "../src/exhibits/focusMedia.ts"
  );

  const items = getFocusMediaItems({
    exhibitId: "work_001",
    focusGlbUrl: "/exhibits/work_001/focus_work_001.glb",
    type: "model3d",
    media: {
      imageUrls: ["/exhibits/work_001/a.jpg", "/exhibits/work_001/b.jpg"],
    },
  });

  assert.deepEqual(items, [
    { kind: "model", url: "/exhibits/work_001/focus_work_001.glb" },
    { kind: "image", url: "/exhibits/work_001/a.jpg" },
    { kind: "image", url: "/exhibits/work_001/b.jpg" },
  ]);
  assert.equal(nextFocusMediaIndex(0, -1, items.length), 2);
  assert.equal(nextFocusMediaIndex(2, 1, items.length), 0);
  assert.equal(nextFocusMediaIndex(0, 1, 1), 0);

  assert.equal(resolveFocusMediaDragStep("image", -68, 4), 1);
  assert.equal(resolveFocusMediaDragStep("image", 68, 4), -1);
  assert.equal(resolveFocusMediaDragStep("image", 12, 4), 0);
  assert.equal(resolveFocusMediaDragStep("image", -68, 80), 0);
  assert.equal(resolveFocusMediaDragStep("model", -68, 4), 0);
});
