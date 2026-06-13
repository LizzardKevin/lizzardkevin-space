import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const files = {
  overlay: readFileSync(new URL("../apps/web/src/overlay/OverlayLayer.tsx", import.meta.url), "utf8"),
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

assert(!files.overlay.includes("useFocusDoubleClickHandler"), "tab overlay must not use double-click close");
assert(!files.overlay.includes("overlay-close-button"), "tab overlay must not render the top-right close button");
assert(!files.overlay.includes("overlay-exit-hint"), "tab overlay must not render the bottom-right exit hint");
assert(files.overlay.includes("overlay-return-button"), "tab overlay must render the center return-to-space button");
assert(files.overlay.includes("回到space"), "tab overlay return button copy must be 回到space");
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

assert(files.splitTabs.includes("frosted-split__detailMasterToggle"), "split tabs need a master detail toggle");
assert(files.splitTabs.includes("Archive detail is folded."), "profile detail folded copy is required");
assert(files.splitTabs.includes("Process detail is folded."), "dev detail folded copy is required");
assert(!files.splitTabs.includes("<strong>{selectedItem.number}</strong>"), "detail header must not show item number");

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
