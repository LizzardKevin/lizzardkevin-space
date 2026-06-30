import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

test("focus image cards gently face the page pointer while hover emphasis stays continuous", async () => {
  const { resolveFocusImageCardMotion } = await importSourceModule(
    "exhibits/focusImageCardMotion.ts",
  );

  const baseInput = {
    frameLeft: 620,
    frameTop: 260,
    frameWidth: 680,
    frameHeight: 420,
    pointerY: 470,
    viewportWidth: 1920,
    viewportHeight: 1080,
  };

  const pageMotion = resolveFocusImageCardMotion({
    ...baseInput,
    pointerX: 1820,
    hovering: false,
  });
  const hoverMotion = resolveFocusImageCardMotion({
    ...baseInput,
    pointerX: 1100,
    hovering: true,
  });

  assert.ok(pageMotion.rotateYDeg > 0, "off-card pointer movement should still rotate the card");
  assert.ok(
    pageMotion.rotateYDeg <= 3.4,
    "off-card pointer movement should stay subtle on desktop",
  );
  assert.ok(
    hoverMotion.glassOpacity > pageMotion.glassOpacity,
    "hovered card emphasis should intensify through glass and outer lift without remapping card pose",
  );
  assert.equal(pageMotion.scale, 1);
});

test("focus image card pose does not jump when the pointer crosses into the image", async () => {
  const { resolveFocusImageCardMotion } = await importSourceModule(
    "exhibits/focusImageCardMotion.ts",
  );

  const edgeInput = {
    frameLeft: 620,
    frameTop: 260,
    frameWidth: 680,
    frameHeight: 420,
    pointerX: 621,
    pointerY: 470,
    viewportWidth: 1920,
    viewportHeight: 1080,
  };
  const pageMotion = resolveFocusImageCardMotion({ ...edgeInput, hovering: false });
  const hoverMotion = resolveFocusImageCardMotion({ ...edgeInput, hovering: true });

  assert.equal(hoverMotion.rotateXDeg, pageMotion.rotateXDeg);
  assert.equal(hoverMotion.rotateYDeg, pageMotion.rotateYDeg);
  assert.equal(hoverMotion.translateXPx, pageMotion.translateXPx);
  assert.equal(hoverMotion.translateYPx, pageMotion.translateYPx);
  assert.equal(hoverMotion.translateZPx, pageMotion.translateZPx);
});

test("focus image card motion is rigid, centered, and clamped", async () => {
  const { resolveFocusImageCardMotion } = await importSourceModule(
    "exhibits/focusImageCardMotion.ts",
  );

  const centered = resolveFocusImageCardMotion({
    frameLeft: 620,
    frameTop: 260,
    frameWidth: 680,
    frameHeight: 420,
    pointerX: 960,
    pointerY: 470,
    viewportWidth: 1920,
    viewportHeight: 1080,
    hovering: false,
  });
  const extreme = resolveFocusImageCardMotion({
    frameLeft: 620,
    frameTop: 260,
    frameWidth: 680,
    frameHeight: 420,
    pointerX: 9999,
    pointerY: -9999,
    viewportWidth: 1920,
    viewportHeight: 1080,
    hovering: true,
  });

  assert.deepEqual(centered, {
    rotateXDeg: 0,
    rotateYDeg: 0,
    translateXPx: 0,
    translateYPx: 0,
    translateZPx: 0,
    scale: 1,
    glassAngleDeg: 0,
    glassOpacity: 0,
  });
  assert.equal(extreme.rotateXDeg, 1.6);
  assert.equal(extreme.rotateYDeg, 3.2);
  assert.equal(extreme.translateXPx, 7);
  assert.equal(extreme.translateYPx, -3);
  assert.equal(extreme.translateZPx, 6);
  assert.equal(extreme.glassAngleDeg, 40.81);
  assert.equal(extreme.glassOpacity, 0.5);
});

test("focus image glass highlight follows the pointer line through the card center", async () => {
  const { resolveFocusImageCardMotion } = await importSourceModule(
    "exhibits/focusImageCardMotion.ts",
  );

  const baseInput = {
    frameLeft: 620,
    frameTop: 260,
    frameWidth: 680,
    frameHeight: 420,
    viewportWidth: 1920,
    viewportHeight: 1080,
    hovering: true,
  };

  assert.equal(
    resolveFocusImageCardMotion({
      ...baseInput,
      pointerX: 1300,
      pointerY: 470,
    }).glassAngleDeg,
    90,
    "right-side pointer should put highlight centers on the right and left edges",
  );
  assert.equal(
    resolveFocusImageCardMotion({
      ...baseInput,
      pointerX: 960,
      pointerY: 260,
    }).glassAngleDeg,
    0,
    "top-side pointer should put highlight centers on the top and bottom edges",
  );
  assert.ok(
    resolveFocusImageCardMotion({
      ...baseInput,
      pointerX: 1300,
      pointerY: 470,
    }).glassOpacity >
      resolveFocusImageCardMotion({
        ...baseInput,
        pointerX: 960,
        pointerY: 470,
        hovering: false,
      }).glassOpacity,
    "hovered glass highlight should be stronger than page-level glass drift",
  );
});
