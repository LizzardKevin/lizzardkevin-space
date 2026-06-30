import assert from "node:assert/strict";
import test from "node:test";
import { cssRule, cssRuleInMedia, declarationValue } from "../helpers/cssAssertions.mjs";
import { readSourceFile } from "../helpers/projectPaths.mjs";

test("Focus desktop layout uses the planned ratio and side panels become frameless split-style text", () => {
  const css = readSourceFile("styles/global.css");
  const layoutRule = cssRule(css, ".focus-layout");
  const panelShellRule = cssRule(css, ".focus-panel");
  const panelRule = cssRule(css, ".focus-panel__inner");
  const overviewRule = cssRule(css, ".focus-overview");
  const storyRule = cssRule(css, ".focus-story");

  assert.equal(
    declarationValue(layoutRule, "grid-template-columns"),
    "minmax(300px, 0.8fr) minmax(720px, 1.8fr) minmax(300px, 0.9fr)",
    "Focus desktop columns should reserve enough center width for uncropped 1080p image cards",
  );
  assert.equal(
    declarationValue(panelRule, "background"),
    "transparent",
    "Focus panels should not render a card background",
  );
  assert.equal(
    declarationValue(panelRule, "padding"),
    "13px 0 16px",
    "Focus panels should use the split-overlay text spacing instead of card padding",
  );
  assert.equal(
    declarationValue(panelRule, "border"),
    "0",
    "Focus panels should not have a surrounding frame",
  );
  assert.equal(declarationValue(panelShellRule, "border-top"), "1px solid rgba(12, 14, 14, 0.08)");
  assert.equal(
    declarationValue(panelRule, "box-shadow"),
    "none",
    "Focus panels should not carry a card shadow",
  );
  assert.doesNotMatch(
    panelRule,
    /backdrop-filter\s*:/,
    "Focus panels should not use backdrop blur on the inner panel",
  );
  assert.equal(
    declarationValue(overviewRule, "max-width"),
    "42ch",
    "Overview copy should use the wider requested readable line length",
  );
  assert.equal(
    declarationValue(storyRule, "max-width"),
    "42ch",
    "Story copy should use the wider requested readable line length",
  );
  assert.equal(
    declarationValue(panelShellRule, "max-width"),
    "430px",
    "Focus side panels should use the wider requested desktop width",
  );
  assert.equal(
    declarationValue(panelShellRule, "max-height"),
    "min(72vh, 640px)",
    "Focus side panels should use the taller requested desktop height",
  );
});

test("Focus tablet layout places media above two readable side columns", () => {
  const css = readSourceFile("styles/global.css");
  const layoutRule = cssRuleInMedia(css, "max-width: 1120px", ".focus-layout");
  const centerRule = cssRuleInMedia(css, "max-width: 1120px", ".focus-layout__center");
  const leftSideRule = cssRuleInMedia(css, "max-width: 1120px", ".focus-layout__side--left");
  const rightSideRule = cssRuleInMedia(css, "max-width: 1120px", ".focus-layout__side--right");
  const panelRule = cssRuleInMedia(css, "max-width: 1120px", ".focus-panel");

  assert.equal(
    declarationValue(layoutRule, "grid-template-columns"),
    "repeat(2, minmax(0, 1fr))",
    "Tablet Focus layout should use two balanced columns below the media stage",
  );
  assert.equal(
    declarationValue(layoutRule, "grid-template-areas"),
    '"center center" "left right"',
    "Tablet Focus layout should place the media stage first/top and the side panels below",
  );
  assert.equal(declarationValue(centerRule, "grid-area"), "center");
  assert.equal(declarationValue(leftSideRule, "grid-area"), "left");
  assert.equal(declarationValue(rightSideRule, "grid-area"), "right");
  assert.equal(
    declarationValue(panelRule, "max-width"),
    "min(420px, calc(100% - 24px))",
    "Tablet panels should stay readable without squeezing against the viewport",
  );
});

test("Focus mobile layout stacks media, overview, and story in one column", () => {
  const css = readSourceFile("styles/global.css");
  const layoutRule = cssRuleInMedia(css, "max-width: 720px", ".focus-layout");
  const centerRule = cssRuleInMedia(css, "max-width: 720px", ".focus-layout__center");
  const panelRule = cssRuleInMedia(css, "max-width: 720px", ".focus-panel");

  assert.equal(
    declarationValue(layoutRule, "grid-template-columns"),
    "minmax(0, 1fr)",
    "Mobile Focus layout should use a single column",
  );
  assert.equal(
    declarationValue(layoutRule, "grid-template-areas"),
    '"center" "left" "right"',
    "Mobile Focus layout should stack media, overview/details, then story",
  );
  assert.equal(
    declarationValue(centerRule, "min-height"),
    "min(620px, 78vh)",
    "Mobile media stage should keep enough vertical room for title, media controls, and dots",
  );
  assert.equal(
    declarationValue(panelRule, "max-width"),
    "calc(100% - 24px)",
    "Mobile panels should fit within the viewport without horizontal overflow",
  );
});
