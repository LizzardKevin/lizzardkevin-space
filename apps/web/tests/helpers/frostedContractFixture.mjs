import assert from "node:assert/strict";
import { cssBlock } from "./cssAssertions.mjs";
import { readSourceFile } from "./projectPaths.mjs";

export const files = {
  app: readSourceFile("App.tsx"),
  overlay: readSourceFile("overlay/OverlayLayer.tsx"),
  topbar: readSourceFile("components/TopBar.tsx"),
  splitTabs: readSourceFile("components/frostedSplit/FrostedSplitTabs.tsx"),
  focusOverlay: readSourceFile("exhibits/FocusOverlay.tsx"),
  focusPanels: readSourceFile("exhibits/FocusContentPanels.tsx"),
  css: readSourceFile("styles/global.css"),
};

export function frostedCssBlock(selector) {
  return cssBlock(files.css, selector);
}

const frostedCssStart = files.css.indexOf("/* --- Frosted Split overlay tabs --- */");
const frostedCssEnd = files.css.indexOf(".overlay-tab-content--dev-stories", frostedCssStart);
assert(frostedCssStart >= 0 && frostedCssEnd > frostedCssStart, "frosted split CSS region must be discoverable");
export const frostedCss = files.css.slice(frostedCssStart, frostedCssEnd);
