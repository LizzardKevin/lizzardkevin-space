import assert from "node:assert/strict";
import test from "node:test";
import { cssRule, cssRuleInMedia, declarationValue } from "../helpers/cssAssertions.mjs";
import { readSourceFile } from "../helpers/projectPaths.mjs";

test("Focus desktop layout uses the planned ratio and side panels become frameless split-style text", () => {
  const css = readSourceFile("styles/global.css");
  const overlayRule = cssRule(css, ".focus-overlay");
  const layoutRule = cssRule(css, ".focus-layout");
  const panelShellRule = cssRule(css, ".focus-panel");
  const panelRule = cssRule(css, ".focus-panel__inner");
  const overviewRule = cssRule(css, ".focus-overview");
  const storyRule = cssRule(css, ".focus-story");

  assert.equal(
    declarationValue(overlayRule, "--focus-top-safe"),
    "clamp(76px, 7.2vh, 92px)",
    "Focus top safe area should compress on short desktop viewports without colliding with the return control",
  );
  assert.equal(
    declarationValue(overlayRule, "--focus-bottom-safe"),
    "clamp(88px, 9vh, 118px)",
    "Focus bottom safe area should compress on short desktop viewports while keeping media controls off the edge",
  );
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

test("Focus small desktop layout compresses side text alongside media", () => {
  const css = readSourceFile("styles/global.css");
  const layoutRule = cssRuleInMedia(css, "max-width: 1600px), (max-height: 900px", ".focus-layout");
  const panelShellRule = cssRuleInMedia(css, "max-width: 1600px), (max-height: 900px", ".focus-panel");
  const panelRule = cssRuleInMedia(css, "max-width: 1600px), (max-height: 900px", ".focus-panel__inner");
  const overviewRule = cssRuleInMedia(css, "max-width: 1600px), (max-height: 900px", ".focus-overview,\n  .focus-story");
  const tagsRule = cssRuleInMedia(css, "max-width: 1600px), (max-height: 900px", ".focus-tags,\n  .focus-details");

  assert.equal(
    declarationValue(layoutRule, "grid-template-columns"),
    "minmax(240px, 0.82fr) minmax(360px, 1.28fr) minmax(280px, 0.9fr)",
    "Small desktop Focus layout should keep side columns useful without starving the measured media stage",
  );
  assert.equal(
    declarationValue(panelShellRule, "max-width"),
    "min(390px, 92%)",
    "Small desktop panels should become narrower before crowding the image card",
  );
  assert.equal(
    declarationValue(panelShellRule, "max-height"),
    "min(68vh, 560px)",
    "Small desktop panels should leave vertical breathing room for media controls",
  );
  assert.equal(
    declarationValue(panelRule, "max-height"),
    "min(68vh, 560px)",
    "Small desktop panel scroll bounds should match the compressed shell",
  );
  assert.equal(
    declarationValue(overviewRule, "max-width"),
    "38ch",
    "Small desktop text should tighten line length to avoid pushing against the media stage",
  );
  assert.equal(
    declarationValue(overviewRule, "font-size"),
    "12px",
    "Small desktop text should step down slightly for 1080p layouts",
  );
  assert.equal(
    declarationValue(overviewRule, "line-height"),
    "1.62",
    "Small desktop text should keep readable leading after the size step-down",
  );
  assert.equal(
    declarationValue(tagsRule, "margin-top"),
    "22px",
    "Small desktop metadata groups should tighten vertical rhythm",
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
