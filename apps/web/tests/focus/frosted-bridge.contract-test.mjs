import assert from "node:assert/strict";
import { files, frostedCssBlock } from "../helpers/frostedContractFixture.mjs";

const focusReturnButtonCss = frostedCssBlock(".focus-return-button");

assert(files.focusOverlay.includes("focus-return-button"), "focus overlay needs a return-to-space button");
assert(
  files.focusOverlay.includes("focus-return-button__prefix") &&
    files.focusOverlay.includes("focus-return-button__space"),
  "focus overlay return button must split 回到 and space like the tab overlay",
);
assert(!files.focusOverlay.includes("‹ RETURN TO SPACE"), "focus overlay return button must not keep English copy");
assert(
  files.focusOverlay.indexOf("focus-return-button") <
    files.focusOverlay.indexOf('className="focus-layout"'),
  "focus overlay return button must render at the overlay top level before the layout grid",
);
assert(
  focusReturnButtonCss.includes("\n  position: fixed;") &&
    focusReturnButtonCss.includes("\n  top: 8px;") &&
    focusReturnButtonCss.includes("\n  left: 50%;") &&
    focusReturnButtonCss.includes("mix-blend-mode: difference") &&
    focusReturnButtonCss.includes("translateX(calc(-50%"),
  "focus overlay return button must mirror the centered LizzardKevin return button",
);
assert(
  focusReturnButtonCss.includes("\n  background: transparent;") &&
    focusReturnButtonCss.includes("\n  border: 0;"),
  "focus overlay return button must remain visually light",
);
assert(
  !focusReturnButtonCss.includes("\n  right: clamp"),
  "focus overlay return button must not remain top-right",
);
assert(files.focusOverlay.includes("hasOrbitInteracted"), "focus overlay needs first-drag state");
assert(files.focusOverlay.includes("drag to orbit"), "focus overlay needs the first-drag hint");
assert(!files.focusOverlay.includes("focus-exit-hint"), "focus overlay must not show double-click exit hint");
assert(!files.focusOverlay.includes("双击空白区域以退出"), "focus overlay must not show double-click exit copy");

assert(files.focusPanels.includes("Overview"), "focus left panel must label Overview");
assert(files.focusPanels.includes("Tags"), "focus left panel must label Tags");
assert(files.focusPanels.includes("Story"), "focus right panel must label Story");
assert(!files.focusPanels.includes("Stories"), "focus right panel must not label Stories");

console.log("focus frosted bridge contract tests passed");
