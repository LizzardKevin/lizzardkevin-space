import assert from "node:assert/strict";
import { files } from "../helpers/spaceContractFixture.mjs";

assert(files.hoverHighlight.includes("restoreFrameRef"), "exhibit hover material restore should be deferred off the hot raycast path");
assert(files.hoverHighlight.includes("requestAnimationFrame"), "exhibit hover material restore should be scheduled with requestAnimationFrame");

assert(files.topbar.includes("isChangingLanguage"), "language toggle must guard against repeated async changes");
assert(files.topbar.includes("await i18n.changeLanguage(next)"), "language toggle must await i18n language changes");
assert(files.topbar.includes("document.documentElement.lang = next"), "language toggle must sync document language");
assert(files.topbar.includes("topbar__settingsButton"), "TopBar must expose a compact settings icon button");
assert(files.topbar.includes("topbar__settingsPanel"), "TopBar must render language and visual controls in a settings panel");
assert(!files.topbar.includes("setQualityPreset"), "settings panel must no longer expose SPACE quality preset controls");
assert(!files.topbar.includes("SPACE_QUALITY_PRESET_ORDER"), "settings panel must not render quality preset options");
assert(files.topbar.includes("toggleAntialias"), "settings panel must update the WebGPU antialias preference");
assert(files.topbar.includes("toggleMotionBlur"), "settings panel must update the motion blur preference");
assert(files.topbar.includes('type="checkbox"'), "visual controls must render as checkboxes");
assert(!files.topbar.includes("topbar__button--language"), "language should no longer be a standalone topbar text toggle");

console.log("space interaction contract tests passed");
