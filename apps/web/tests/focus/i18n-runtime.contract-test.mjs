import assert from "node:assert/strict";
import { readSourceFile } from "../helpers/projectPaths.mjs";

const panelsSource = readSourceFile("exhibits/FocusContentPanels.tsx");
const overlaySource = readSourceFile("exhibits/FocusOverlay.tsx");

assert(
  panelsSource.includes("type FocusPanelCopy"),
  "Focus panels must receive localized panel copy instead of hardcoded headings",
);
assert(
  panelsSource.includes("copy: FocusPanelCopy"),
  "Focus panel props must carry the localized copy object",
);
for (const hardcoded of [
  ">Overview</h2>",
  ">Story</h2>",
  ">Tags</h3>",
  ">Details</h3>",
  "加载中…",
  "暂无概述",
  'aria-label="展品概述"',
  'aria-label="展品故事"',
]) {
  assert(!panelsSource.includes(hardcoded), `Focus panels must not hardcode ${hardcoded}`);
}

assert(
  overlaySource.includes("useTranslation") &&
    overlaySource.includes("normalizeSupportedLanguage") &&
    overlaySource.includes("const focusLanguage"),
  "Focus overlay must subscribe to i18n language changes",
);
assert(
  overlaySource.includes("loadExhibitContent(exhibit.exhibitId, focusLanguage)") &&
    overlaySource.includes("[exhibit.exhibitId, focusLanguage]"),
  "Focus content must reload when the active language changes",
);
for (const key of [
  "focus.copy",
  "focus.loadingExhibit",
  "focus.modelLoadFailed",
  "focus.returnPrefix",
  "focus.closeEnlargedImage",
  "focus.previousMedia",
  "focus.nextMedia",
  "focus.mediaPages",
  "focus.showModel",
  "focus.showVideo",
  "focus.showImage",
  "focus.dragToOrbit",
]) {
  assert(overlaySource.includes(`"${key}"`), `Focus overlay must read ${key} from i18n`);
}

console.log("focus i18n runtime contract tests passed");
