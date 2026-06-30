import assert from "node:assert/strict";
import { cssRule, declarationValue } from "../helpers/cssAssertions.mjs";
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
assert(!files.topbar.includes("toggleMotionBlur"), "settings panel must not expose motion blur controls");
assert(!files.topbar.includes("motionBlur"), "TopBar must not keep motion blur copy or state");
assert(files.topbar.includes('type="checkbox"'), "visual controls must render as checkboxes");
assert(!files.topbar.includes("topbar__button--language"), "language should no longer be a standalone topbar text toggle");

const topbarButtonRule = cssRule(files.css, ".topbar__button");
const topbarSettingsRule = cssRule(files.css, ".topbar__settingsButton");
assert.equal(
  declarationValue(topbarButtonRule, "mix-blend-mode"),
  "difference",
  "TopBar text buttons should stay readable against bright and dark SPACE backgrounds",
);
assert.equal(
  declarationValue(topbarButtonRule, "font-weight"),
  "600",
  "TopBar text should be sturdy enough to survive the bright gallery ceiling",
);
assert.match(
  declarationValue(topbarButtonRule, "text-shadow"),
  /rgba\(0, 0, 0, 0\.55\)/,
  "TopBar text should keep a crisp dark edge over bright SPACE surfaces",
);
assert.equal(
  declarationValue(topbarSettingsRule, "mix-blend-mode"),
  "difference",
  "TopBar settings icon should stay readable against bright and dark SPACE backgrounds",
);
assert.match(
  declarationValue(topbarSettingsRule, "filter"),
  /drop-shadow/,
  "TopBar settings icon should keep a default shadow before hover",
);

console.log("space interaction contract tests passed");
