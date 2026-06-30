import assert from "node:assert/strict";
import test from "node:test";
import { cssRule, cssRuleInMedia, declarationValue } from "../helpers/cssAssertions.mjs";
import { readSourceFile } from "../helpers/projectPaths.mjs";

test("Focus return action mirrors the LizzardKevin centered top return affordance", () => {
  const overlaySource = readSourceFile("exhibits/FocusOverlay.tsx");
  const css = readSourceFile("styles/global.css");

  const overlayIndex = overlaySource.indexOf("className={`focus-overlay");
  const layoutIndex = overlaySource.indexOf('className="focus-layout"');
  const centerIndex = overlaySource.indexOf('className="focus-layout__center"');
  const leftColumnIndex = overlaySource.indexOf('side="left"', layoutIndex);
  const overviewIndex = overlaySource.indexOf("FocusOverviewPanel", leftColumnIndex);
  const returnIndex = overlaySource.indexOf("focus-return-button", overlayIndex);
  const titleIndex = overlaySource.indexOf("FocusExhibitTitle", leftColumnIndex);
  const returnRule = cssRule(css, ".focus-return-button");
  const titleRule = cssRule(css, ".focus-title");

  assert.ok(overlayIndex > 0, "Focus overlay must exist");
  assert.ok(layoutIndex > overlayIndex, "Focus layout must be rendered inside the overlay");
  assert.ok(centerIndex > 0, "Focus layout center must exist");
  assert.ok(leftColumnIndex > layoutIndex, "Focus left column must be rendered inside the layout");
  assert.ok(returnIndex > overlayIndex, "Return button should be rendered in the focus overlay");
  assert.ok(returnIndex < layoutIndex, "Return button should sit outside the centered media stage");
  assert.ok(titleIndex > leftColumnIndex, "Exhibit title should move into the left text column");
  assert.ok(
    titleIndex < overviewIndex,
    "Exhibit title should sit above the overview/tags/details content",
  );
  assert.equal(
    overlaySource.indexOf("FocusExhibitTitle", centerIndex),
    -1,
    "Exhibit title should no longer sit in the centered media stage",
  );
  assert.ok(overlaySource.includes("focus-return-button__prefix"), "Return button should split 回到 like the tab overlay");
  assert.ok(overlaySource.includes("focus-return-button__space"), "Return button should split space like the tab overlay");
  assert.ok(!overlaySource.includes("‹ RETURN TO SPACE"), "Focus return button should not keep the English return copy");

  assert.equal(declarationValue(returnRule, "position"), "fixed");
  assert.equal(declarationValue(returnRule, "top"), "8px");
  assert.equal(declarationValue(returnRule, "left"), "50%");
  assert.equal(declarationValue(returnRule, "background"), "transparent");
  assert.equal(declarationValue(returnRule, "border"), "0");
  assert.equal(declarationValue(returnRule, "mix-blend-mode"), "difference");
  assert.match(
    returnRule,
    /translateX\(calc\(-50%/,
    "Return button should use the same centered transform language as the LizzardKevin overlay",
  );
  assert.doesNotMatch(returnRule, /right\s*:/, "Return button should not stay top-right");
  assert.equal(declarationValue(titleRule, "position"), "relative");
  assert.equal(declarationValue(titleRule, "width"), "100%");
  assert.equal(declarationValue(titleRule, "max-width"), "430px");
  assert.equal(declarationValue(titleRule, "text-align"), "left");
  assert.equal(declarationValue(titleRule, "font-size"), "clamp(52px, 4.1vw, 78px)");
  assert.equal(declarationValue(titleRule, "line-height"), "0.9");
  assert.equal(declarationValue(titleRule, "border-top"), "1px solid rgba(12, 14, 14, 0.12)");
  assert.equal(declarationValue(titleRule, "border-bottom"), "1px solid rgba(12, 14, 14, 0.08)");
  assert.match(
    titleRule,
    /translateY\(-8px\)/,
    "Focus title should enter like a left-column architectural sheet header",
  );
});

test("Focus title accepts optional subtitle and overlay forwards loaded copy metadata", () => {
  const titleSource = readSourceFile("exhibits/FocusExhibitTitle.tsx");
  const overlaySource = readSourceFile("exhibits/FocusOverlay.tsx");
  const css = readSourceFile("styles/global.css");

  assert.match(titleSource, /subtitle\?: string/, "Focus title should accept an optional subtitle prop");
  assert.match(
    titleSource,
    /subtitleCopy[\s\S]*focus-title__subtitle/,
    "Focus title should render a dedicated subtitle element only when copy is present",
  );
  assert.doesNotMatch(
    titleSource,
    /style=\{\{/,
    "Focus subtitle visual styles should live in CSS instead of inline style",
  );
  assert.match(
    css,
    /\.focus-title__subtitle\s*{[^}]*display:\s*block;[^}]*margin-top:\s*16px;[^}]*font-size:\s*12px;[^}]*font-weight:\s*400;[^}]*letter-spacing:\s*0\.12em;[^}]*text-transform:\s*none;/s,
    "Focus subtitle visual styles should be defined by the dedicated CSS class",
  );
  assert.ok(
    overlaySource.includes("subtitle={content?.subtitle}"),
    "FocusOverlay should pass loaded content subtitle into FocusExhibitTitle",
  );
  assert.ok(
    overlaySource.includes("metadata={content?.metadata}"),
    "FocusOverlay should pass loaded metadata into the left content panel",
  );
  assert.ok(
    overlaySource.includes("tags={focusTags}") &&
      overlaySource.includes("content?.tags ?? fallbackFocusTags"),
    "FocusOverlay should prefer exhibit content tags before fallback generated tags",
  );
});
