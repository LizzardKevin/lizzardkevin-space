import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(testDir, "../src");

function cssRule(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`, "s"));
  assert.ok(match?.groups?.body, `${selector} rule should exist`);
  return match.groups.body;
}

function mediaBlock(css, query) {
  const mediaStart = css.indexOf(`@media (${query})`);
  assert.notEqual(mediaStart, -1, `${query} media query should exist`);

  const blockStart = css.indexOf("{", mediaStart);
  assert.notEqual(blockStart, -1, `${query} media query should open a block`);

  let depth = 0;
  for (let index = blockStart; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(blockStart + 1, index);
  }

  assert.fail(`${query} media query should close its block`);
}

function cssRuleInMedia(css, query, selector) {
  return cssRule(mediaBlock(css, query), selector);
}

function declarationValue(ruleBody, property) {
  const match = ruleBody.match(new RegExp(`${property}\\s*:\\s*(?<value>[^;]+);`, "s"));
  assert.ok(match?.groups?.value, `${property} declaration should exist`);
  return match.groups.value.replace(/\s+/g, " ").trim();
}

test("Focus return action mirrors the LizzardKevin centered top return affordance", () => {
  const overlaySource = fs.readFileSync(path.join(srcDir, "exhibits/FocusOverlay.tsx"), "utf8");
  const css = fs.readFileSync(path.join(srcDir, "styles/global.css"), "utf8");

  const overlayIndex = overlaySource.indexOf("className={`focus-overlay");
  const layoutIndex = overlaySource.indexOf('className="focus-layout"');
  const centerIndex = overlaySource.indexOf('className="focus-layout__center"');
  const returnIndex = overlaySource.indexOf("focus-return-button", overlayIndex);
  const titleIndex = overlaySource.indexOf("FocusExhibitTitle", centerIndex);
  const returnRule = cssRule(css, ".focus-return-button");
  const titleRule = cssRule(css, ".focus-title");

  assert.ok(overlayIndex > 0, "Focus overlay must exist");
  assert.ok(layoutIndex > overlayIndex, "Focus layout must be rendered inside the overlay");
  assert.ok(centerIndex > 0, "Focus layout center must exist");
  assert.ok(returnIndex > overlayIndex, "Return button should be rendered in the focus overlay");
  assert.ok(returnIndex < layoutIndex, "Return button should sit outside the centered media stage");
  assert.ok(titleIndex > centerIndex, "Exhibit title should remain in the centered stage");
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
  assert.equal(declarationValue(titleRule, "left"), "0");
  assert.equal(declarationValue(titleRule, "right"), "0");
  assert.equal(declarationValue(titleRule, "text-align"), "center");
});

test("Focus media uses dark cursor, image drag affordance, and page dots", () => {
  const overlaySource = fs.readFileSync(path.join(srcDir, "exhibits/FocusOverlay.tsx"), "utf8");
  const css = fs.readFileSync(path.join(srcDir, "styles/global.css"), "utf8");

  assert.match(
    overlaySource,
    /className=\{`focus-overlay[\s\S]*data-cursor-tone="light"/,
    "Focus overlay should inherit the DevStories dark cursor tone on light backgrounds",
  );
  assert.ok(
    overlaySource.includes("onPointerDown={handleImagePointerDown}") &&
      overlaySource.includes("onPointerUp={handleImagePointerUp}"),
    "Focus images should support horizontal pointer drag navigation",
  );
  assert.ok(
    overlaySource.includes("mediaTransitionDirection") &&
      overlaySource.includes("focus-image--step-") &&
      overlaySource.includes("key={activeMedia.url}"),
    "Focus image page changes should remount with direction-aware animation classes",
  );
  assert.ok(
    overlaySource.includes("focus-media-dots") && overlaySource.includes("focus-media-dot--model"),
    "Focus media should render pagination dots and mark the 3D model page distinctly",
  );
  assert.match(
    css,
    /\.focus-image\s*{[^}]*top:\s*calc\([^}]*translate\(-50%, -50%\)/s,
    "Focus image should be vertically centered in the central media stage",
  );
  assert.match(
    css,
    /\.focus-media-dots\s*{[^}]*bottom:/s,
    "Focus media dots should sit near the bottom of the focus stage",
  );
  assert.match(
    css,
    /\.focus-media-dot--model::before\s*{[^}]*rotate\(45deg\)/s,
    "The 3D model page dot should use a distinct diamond mark",
  );
  assert.match(
    css,
    /@keyframes\s+focusImageInFromRight[\s\S]*@keyframes\s+focusImageInFromLeft/s,
    "Focus image switches should define left/right entrance animations",
  );
  assert.match(
    css,
    /\.focus-media-arrow\s*{[^}]*--focus-media-half-width:\s*min\(520px,\s*37vw\)/s,
    "Focus media arrows should position themselves from the image half-width",
  );
  assert.match(
    css,
    /\.focus-media-arrow:active\s*{[^}]*scale\(0\.92\)/s,
    "Focus media arrows should visibly press when clicked",
  );
  assert.match(
    css,
    /\.focus-media-arrow--left::before\s*{[^}]*rgba\(12,\s*14,\s*14,\s*0\.52\)/s,
    "Focus media arrows should stay visible on the light Focus background",
  );
});

test("Focus desktop layout uses the planned ratio and side panels become frameless split-style text", () => {
  const css = fs.readFileSync(path.join(srcDir, "styles/global.css"), "utf8");
  const layoutRule = cssRule(css, ".focus-layout");
  const panelShellRule = cssRule(css, ".focus-panel");
  const panelRule = cssRule(css, ".focus-panel__inner");
  const overviewRule = cssRule(css, ".focus-overview");
  const storyRule = cssRule(css, ".focus-story");

  assert.equal(
    declarationValue(layoutRule, "grid-template-columns"),
    "minmax(280px, 0.9fr) minmax(420px, 1.35fr) minmax(320px, 1fr)",
    "Focus desktop columns should preserve the planned left/media/right ratio",
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
    "34ch",
    "Overview copy should keep a readable line length",
  );
  assert.equal(
    declarationValue(storyRule, "max-width"),
    "34ch",
    "Story copy should keep a readable line length",
  );
});

test("Focus tablet layout places media above two readable side columns", () => {
  const css = fs.readFileSync(path.join(srcDir, "styles/global.css"), "utf8");
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
  const css = fs.readFileSync(path.join(srcDir, "styles/global.css"), "utf8");
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

test("Focus content panels use generic copy structure and hide empty optional blocks", () => {
  const panelsSource = fs.readFileSync(
    path.join(srcDir, "exhibits/FocusContentPanels.tsx"),
    "utf8",
  );
  const storyPanelSource = panelsSource.slice(
    panelsSource.indexOf("export function FocusStoryPanel"),
  );

  const overviewIndex = panelsSource.indexOf(">Overview</h2>");
  const tagsIndex = panelsSource.indexOf(">Tags</h3>");
  const detailsIndex = panelsSource.indexOf(">Details</h3>");

  assert.ok(overviewIndex > 0, "Focus left panel must start with an Overview block");
  assert.ok(tagsIndex > overviewIndex, "Focus left panel must render Tags after Overview");
  assert.ok(detailsIndex > tagsIndex, "Focus left panel must render Details after Tags");
  assert.match(
    panelsSource,
    /import type \{ ExhibitContentMetadataItem \} from "\.\/exhibitContent";/,
    "Details metadata should use the ExhibitContentMetadataItem content type",
  );
  assert.match(
    panelsSource,
    /tags\.length > 0 \? \([\s\S]*<h3>Tags<\/h3>/,
    "Tags block should only render when tags are present",
  );
  assert.match(
    panelsSource,
    /const hasMetadata = \(metadata\?\.length \?\? 0\) > 0;[\s\S]*hasMetadata \? \([\s\S]*<h3>Details<\/h3>[\s\S]*metadata\.map/,
    "Details block should only render when metadata entries are present",
  );
  assert.ok(
    panelsSource.includes("item.label") && panelsSource.includes("item.value"),
    "Details metadata should render label/value pairs",
  );
  assert.match(
    panelsSource,
    /<div className="focus-details" aria-label="Details">[\s\S]*<dl>[\s\S]*<dt>\{item\.label\}<\/dt>[\s\S]*<dd>\{item\.value\}<\/dd>[\s\S]*<\/dl>/,
    "Details metadata should render with a dedicated dl/dt/dd structure",
  );
  assert.doesNotMatch(
    panelsSource,
    /<div className="focus-tags" aria-label="Details">/,
    "Details metadata should not reuse the tags visual structure",
  );
  assert.ok(storyPanelSource.includes(">Story</h2>"), "Focus right panel heading must be singular Story");
  assert.ok(!storyPanelSource.includes(">Stories</h2>"), "Focus right panel must not use Stories copy");
  assert.match(
    storyPanelSource,
    /!loading && !hasStoryHtml[\s\S]*return null;/,
    "Missing story content after loading should omit the story card instead of showing fallback copy",
  );
  assert.equal(
    (storyPanelSource.match(/focus-panel__placeholder/g) ?? []).length,
    1,
    "Focus story panel should only keep the loading placeholder",
  );
});

test("Focus title accepts optional subtitle and overlay forwards loaded copy metadata", () => {
  const titleSource = fs.readFileSync(
    path.join(srcDir, "exhibits/FocusExhibitTitle.tsx"),
    "utf8",
  );
  const overlaySource = fs.readFileSync(path.join(srcDir, "exhibits/FocusOverlay.tsx"), "utf8");
  const css = fs.readFileSync(path.join(srcDir, "styles/global.css"), "utf8");

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
    /\.focus-title__subtitle\s*{[^}]*display:\s*block;[^}]*margin-top:\s*6px;[^}]*font-size:\s*12px;[^}]*font-weight:\s*400;[^}]*letter-spacing:\s*0\.08em;[^}]*text-transform:\s*none;/s,
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
