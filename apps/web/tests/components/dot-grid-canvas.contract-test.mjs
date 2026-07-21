import assert from "node:assert/strict";
import test from "node:test";
import { cssRule } from "../helpers/cssAssertions.mjs";
import { readSourceFile } from "../helpers/projectPaths.mjs";

test("dot grid canvas stretches to fill its host instead of its intrinsic backing size", () => {
  const css = readSourceFile("styles/global.css");
  const canvasSource = readSourceFile("components/DotGridCanvas.tsx");

  const rule = cssRule(css, ".dot-grid-canvas");
  assert.match(rule, /position:\s*absolute;/, "dot grid canvas should pin to the host box");
  assert.match(rule, /inset:\s*0;/, "dot grid canvas should anchor every edge");
  assert.match(rule, /width:\s*100%;/, "dot grid canvas must override the replaced-element intrinsic width");
  assert.match(rule, /height:\s*100%;/, "dot grid canvas must override the replaced-element intrinsic height");
  assert.match(rule, /pointer-events:\s*none;/, "dot grid canvas must never intercept input");

  assert.ok(canvasSource.includes('aria-hidden="true"'), "dot grid canvas should stay decorative-only");
  assert.ok(
    canvasSource.includes("prefers-reduced-motion: reduce"),
    "dot grid canvas should skip pointer physics under reduced motion",
  );
  assert.ok(
    canvasSource.includes("ResizeObserver"),
    "dot grid canvas should rebuild its point field when the host resizes",
  );
});
