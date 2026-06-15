import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = {
  app: readFileSync(new URL("../apps/web/src/App.tsx", import.meta.url), "utf8"),
  overlay: readFileSync(new URL("../apps/web/src/overlay/OverlayLayer.tsx", import.meta.url), "utf8"),
  topbar: readFileSync(new URL("../apps/web/src/components/TopBar.tsx", import.meta.url), "utf8"),
  splitTabs: readFileSync(
    new URL("../apps/web/src/components/frostedSplit/FrostedSplitTabs.tsx", import.meta.url),
    "utf8",
  ),
  focusOverlay: readFileSync(new URL("../apps/web/src/exhibits/FocusOverlay.tsx", import.meta.url), "utf8"),
  focusPanels: readFileSync(new URL("../apps/web/src/exhibits/FocusContentPanels.tsx", import.meta.url), "utf8"),
  css: readFileSync(new URL("../apps/web/src/styles/global.css", import.meta.url), "utf8"),
};

function cssBlock(selector) {
  const start = files.css.indexOf(`${selector} {`);
  assert(start >= 0, `${selector} CSS block must exist`);
  const end = files.css.indexOf("\n}", start);
  assert(end >= 0, `${selector} CSS block must close`);
  return files.css.slice(start, end);
}

const overlayReturnButtonCss = cssBlock(".overlay-return-button");
const focusReturnButtonCss = cssBlock(".focus-return-button");
const frostedContentCss = cssBlock(".frosted-split__content");
const frostedHeaderCss = cssBlock(".frosted-split__header");
const frostedBodyCss = cssBlock(".frosted-split__body");
const frostedDetailPanelCss = cssBlock(".frosted-split__detailPanel");
const frostedDetailPanelInnerCss = cssBlock(".frosted-split__detailPanelInner");
const frostedCssStart = files.css.indexOf("/* --- Frosted Split overlay tabs --- */");
const frostedCssEnd = files.css.indexOf(".overlay-tab-content--dev-stories", frostedCssStart);
assert(frostedCssStart >= 0 && frostedCssEnd > frostedCssStart, "frosted split CSS region must be discoverable");
const frostedCss = files.css.slice(frostedCssStart, frostedCssEnd);

assert(!files.overlay.includes("useFocusDoubleClickHandler"), "tab overlay must not use double-click close");
assert(!files.overlay.includes("overlay-close-button"), "tab overlay must not render the top-right close button");
assert(!files.overlay.includes("overlay-exit-hint"), "tab overlay must not render the bottom-right exit hint");
assert(files.overlay.includes("overlay-return-button"), "tab overlay must render the center return-to-space button");
assert(files.overlay.includes("回到space"), "tab overlay return button copy must be 回到space");
assert(files.topbar.includes("data-space-word-origin"), "TopBar SPACE word must expose a stable morph origin marker");
assert(files.app.includes("spaceWordSourceRect"), "App must capture the SPACE word source rect before opening tabs");
assert(files.overlay.includes("spaceWordSourceRect"), "OverlayLayer must accept the SPACE word source rect");
assert(files.overlay.includes("overlay-return-button__prefix"), "return-to-space button must split 回到 into a prefix span");
assert(files.overlay.includes("overlay-return-button__space"), "return-to-space button must split space into its own morphing span");
assert(files.overlay.includes("overlay-return-button--from-source"), "return button must have a from-source morph phase");
assert(files.overlay.includes("overlay-return-button--settled"), "return button must have a settled morph phase");
assert(files.overlay.includes("overlay-return-button--closing"), "return button must have a closing morph phase");
assert(
  overlayReturnButtonCss.includes("\n  top: 8px;") && overlayReturnButtonCss.includes("\n  left: 50%;"),
  "tab overlay return button must sit at the top center like the SPACE top menu",
);
assert(
  !overlayReturnButtonCss.includes("\n  top: 50%;"),
  "tab overlay return button must not remain vertically centered",
);
assert(
  !overlayReturnButtonCss.includes("calc(-50% + var(--overlay-return-y))"),
  "tab overlay return button must not vertically translate like a centered element",
);

assert(!files.splitTabs.includes("detailExpanded"), "split tabs must not keep a master detail expanded state");
assert(!files.splitTabs.includes("getFoldedDetailCopy"), "split tabs must not render a folded master detail copy");
assert(!files.splitTabs.includes("frosted-split__detailsTop"), "split tabs must not render a top-level Detail header");
assert(!files.splitTabs.includes("frosted-split__detailMasterToggle"), "split tabs must not render a master detail toggle");
assert(!files.splitTabs.includes("<details"), "split tabs must not use native details because collapse needs custom animation");
assert(files.splitTabs.includes("closedGroupIds"), "split tabs must keep local closed group state");
assert(files.splitTabs.includes("aria-expanded={!closed}"), "split detail toggles must expose controlled aria-expanded state");
assert(files.splitTabs.includes("frosted-split__detailGroup--open"), "split detail groups must mark default-open animated state");
assert(files.splitTabs.includes("frosted-split__detailPanel"), "split tabs must render animated detail panels");
assert(files.splitTabs.includes("key={selectedItem.id}"), "switching item must remount detail groups so all groups reset open");
assert(frostedCss.includes("overflow-x: hidden"), "frosted split text rails must hide horizontal overflow");
assert(!frostedCss.includes("overflow-x: auto"), "frosted split must not create horizontal scrollbars");
assert(frostedContentCss.includes("--split-index-track"), "frosted content must define shared index column track");
assert(frostedContentCss.includes("--split-stage-track"), "frosted content must define shared stage column track");
assert(frostedContentCss.includes("--split-detail-track"), "frosted content must define shared detail column track");
assert(
  frostedHeaderCss.includes("var(--split-index-track) var(--split-stage-track) var(--split-detail-track)") &&
    frostedBodyCss.includes("var(--split-index-track) var(--split-stage-track) var(--split-detail-track)"),
  "frosted header and body must share the same three-column rail grid",
);
assert(
  frostedDetailPanelCss.includes("grid-template-rows") && frostedDetailPanelCss.includes("0fr") &&
    frostedDetailPanelCss.includes("max-height 420ms"),
  "detail panel must animate closed height with CSS grid rows",
);
assert(
  frostedCss.includes(".frosted-split__detailGroup--open .frosted-split__detailPanel") &&
    frostedCss.includes("1fr"),
  "open detail group must animate panel to one flexible row",
);
assert(
  frostedDetailPanelInnerCss.includes("translateY") && frostedDetailPanelInnerCss.includes("opacity"),
  "detail panel inner content must animate opacity and vertical offset",
);

assert(files.css.includes("translateY(-124px)"), "stage transition distance must be increased upward");
assert(files.css.includes("translateY(124px)"), "stage transition distance must be increased downward");
assert(
  !files.css.includes(".frosted-split__stageLayer--single {\n  animation: frostedStageIn"),
  "single stage layer must not always replay its fade-in animation",
);

assert(files.focusOverlay.includes("focus-return-button"), "focus overlay needs a return-to-space button");
assert(files.focusOverlay.includes("回到space"), "focus overlay return button copy must be 回到space");
assert(
  focusReturnButtonCss.includes("\n  top: 8px;") && focusReturnButtonCss.includes("\n  left: 50%;"),
  "focus overlay return button must align with the SPACE top menu",
);
assert(files.focusOverlay.includes("hasOrbitInteracted"), "focus overlay needs first-drag state");
assert(files.focusOverlay.includes("drag to orbit"), "focus overlay needs the first-drag hint");
assert(!files.focusOverlay.includes("focus-exit-hint"), "focus overlay must not show double-click exit hint");
assert(!files.focusOverlay.includes("双击空白区域以退出"), "focus overlay must not show double-click exit copy");

assert(files.focusPanels.includes("Overview"), "focus left panel must label Overview");
assert(files.focusPanels.includes("Tags"), "focus left panel must label Tags");
assert(files.focusPanels.includes("Stories"), "focus right panel must label Stories");

console.log("frosted overlay contract tests passed");
