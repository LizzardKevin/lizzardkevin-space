import assert from "node:assert/strict";
import { cssRule, declarationValue } from "../helpers/cssAssertions.mjs";
import { files } from "../helpers/spaceContractFixture.mjs";
import { readProjectFile } from "../helpers/projectPaths.mjs";

assert(files.hoverHighlight.includes("restoreFrameRef"), "exhibit hover material restore should be deferred off the hot raycast path");
assert(files.hoverHighlight.includes("requestAnimationFrame"), "exhibit hover material restore should be scheduled with requestAnimationFrame");
assert(
  files.hoverHighlight.includes("target.suppressHoverHighlight"),
  "projector targets must be able to keep cursor feedback without changing mesh emissive material",
);
assert(
  files.spaceScene.includes('exhibitTarget?.interactionKind !== "projector"'),
  "projector hover should not show the floating exhibit name tag over the screen",
);
assert(
  files.exhibitTargetLabel.includes("resolveExhibitLabelUiPosition") &&
    !files.exhibitTargetLabel.includes("computeExhibitLabelAnchor") &&
    !files.exhibitTargetLabel.includes("requestAnimationFrame") &&
    !files.exhibitTargetLabel.includes("exhibit-target-label--float") &&
    !files.css.includes("exhibit-target-label--float") &&
    files.css.includes(".exhibit-target-label") &&
    files.css.includes("color: var(--space-paper)") &&
    files.css.includes("0 1px 2px rgb(23 40 42 / 0.85)") &&
    !/\.exhibit-target-label\s*\{[^}]*?rgba\(255, 255, 255, 0\.58\)/.test(files.css),
  "exhibit hover name tag should render as cursor-adjacent canvas UI in the paper/ink HUD language (no glow)",
);
assert(
  files.exhibitRaycast.includes("lastActiveKey") &&
    files.exhibitRaycast.includes("target.object.uuid") &&
    files.exhibitRaycast.includes("target.interactionKind"),
  "exhibit raycast target change detection must distinguish projector and exhibit targets that share an exhibitId",
);
const hudSource = readProjectFile("apps/web/src/space/SpaceHud.tsx");
const desktopSource = readProjectFile("apps/web/src/pages/SpaceDesktopExperience.tsx");
const summarySource = readProjectFile("apps/web/src/space/exhibitContentSummary.ts");
assert(
  desktopSource.includes("fetchExhibitContentSummary") && desktopSource.includes("exhibitHintForTarget"),
  "hover exhibit hint should load content.json on demand and filter by current target",
);
assert(
  hudSource.includes("space-exhibit-hint__title") && hudSource.includes("space-exhibit-hint__subtitle"),
  "bottom-of-screen exhibit hint should render target title and subtitle",
);
assert(
  summarySource.includes("content.json") && summarySource.includes("summaryCache"),
  "exhibit content summary must be fetched per-exhibit with an in-session cache",
);
assert(
  desktopSource.includes('interactionKind === "exhibit"'),
  "hover hint must only respond to exhibit targets, not the projector",
);
assert(
  files.css.includes(".space-exhibit-hint__title") &&
    files.css.includes(".space-exhibit-hint__subtitle") &&
    files.css.includes("bottom: 40px"),
  "exhibit hint should be styled bottom-center in the HUD language",
);

assert(
  files.exhibitInteractionRegistryProvider.includes("ExhibitInteractionRegistryProvider") &&
    files.exhibitInteractionRegistry.includes("useRegisterExhibitInteractionTarget") &&
    files.spaceScene.includes("ExhibitInteractionRegistryProvider"),
  "SPACE hover raycast should use a scoped interaction registry instead of full-scene traversal",
);
assert(
  files.exhibitRaycast.includes("useExhibitInteractionTargets") &&
    files.exhibitRaycast.includes("raycaster.intersectObjects(interactionTargets, true)") &&
    !files.exhibitRaycast.includes("scene.children"),
  "ExhibitRaycast should test registered real exhibit meshes, not every object in the scene",
);
assert(
  files.desktop.includes("const spaceRenderPaused = focusSurfaceOpen || routeBlocked") &&
    files.desktop.includes("paused={spaceRenderPaused}") &&
    files.canvasHost.includes('frameloop={paused ? "never" : "always"}') &&
    files.canvasHost.includes("paused ? \" space-canvasWrap--disabled\" : \"\""),
  "SPACE Canvas must pause its render loop while Focus, LizzardKevin, or DevStories overlays are open",
);
assert(
  !files.sceneExhibitPlacement.includes("exhibitInteractionRoot") &&
    !files.sceneExhibitPlacement.includes("interaction_proxy") &&
    !files.exhibitRaycast.includes("exhibitInteractionRoot"),
  "SPACE exhibit hover raycast should not use the reverted proxy target path",
);
assert(
  files.hud.includes("projector-controls-hint") && files.css.includes(".projector-controls-hint"),
  "projector hover must expose a small center-bottom Q/E hint outside the 3D mesh",
);
const projectorHintRule = cssRule(files.css, ".projector-controls-hint");
assert.equal(
  declarationValue(projectorHintRule, "background"),
  "transparent",
  "projector Q/E hint should not draw a rectangular surface",
);
assert.equal(
  declarationValue(projectorHintRule, "border"),
  "0",
  "projector Q/E hint should not draw a border",
);
assert.match(
  declarationValue(projectorHintRule, "text-shadow"),
  /0 0/,
  "projector Q/E hint should use a glowing glyph outline",
);
const jumpHintRule = cssRule(files.css, ".jump-hint");
assert.equal(declarationValue(jumpHintRule, "background"), "transparent");
assert.equal(declarationValue(jumpHintRule, "border"), "0");
assert.match(declarationValue(jumpHintRule, "text-shadow"), /0 0/);
const toastRule = cssRule(files.css, ".space-toast");
assert.equal(declarationValue(toastRule, "background"), "transparent");
assert.equal(declarationValue(toastRule, "border"), "0");
assert.match(declarationValue(toastRule, "text-shadow"), /0 0/);
assert.match(files.toast, /className=["']space-toast["']/);
assert(
  files.desktop.includes("event.repeat"),
  "holding Q/E should not flood projector history through OS key repeat",
);

assert(files.topbar.includes("isChangingLanguage"), "language toggle must guard against repeated async changes");
assert(files.topbar.includes("await i18n.changeLanguage(next)"), "language toggle must await i18n language changes");
assert(files.topbar.includes("document.documentElement.lang = next"), "language toggle must sync document language");
assert(files.topbar.includes("topbar__settingsButton"), "TopBar must expose a compact settings icon button");
assert(files.topbar.includes("topbar__settingsPanel"), "TopBar must render language and visual controls in a settings panel");
assert(files.topbar.includes("setQualityPreset"), "settings panel must update the SPACE renderer profile");
assert(files.topbar.includes('setQualityPreset("full")'), "settings panel must expose the full profile");
assert(files.topbar.includes('setQualityPreset("simplified")'), "settings panel must expose the simplified profile");
assert(!files.topbar.includes("toggleAntialias"), "settings panel must not expose a separate antialias preference");
assert(!files.topbar.includes("toggleMotionBlur"), "settings panel must not expose motion blur controls");
assert(!files.topbar.includes("motionBlur"), "TopBar must not keep motion blur copy or state");
assert(!files.topbar.includes('type="checkbox"'), "profile selection must use exactly two buttons, not a checkbox");
assert(!files.topbar.includes("topbar__button--language"), "language should no longer be a standalone topbar text toggle");

const topbarButtonRule = cssRule(files.css, ".topbar__button");
const topbarSettingsRule = cssRule(files.css, ".topbar__settingsButton");
assert.equal(
  declarationValue(topbarButtonRule, "mix-blend-mode"),
  "normal",
  "TopBar text must use the shared ink surface instead of scene-dependent blending",
);
assert.equal(
  declarationValue(topbarButtonRule, "font-weight"),
  "650",
  "TopBar text should be sturdy enough to survive the bright gallery ceiling",
);
assert.equal(
  declarationValue(topbarButtonRule, "text-shadow"),
  "none",
  "TopBar text should not rely on glow or shadow",
);
assert.equal(
  declarationValue(topbarSettingsRule, "mix-blend-mode"),
  "normal",
  "TopBar settings icon must use the shared HUD surface",
);
assert.equal(
  declarationValue(topbarSettingsRule, "filter"),
  "none",
  "TopBar settings icon should not add a glow or drop shadow",
);

console.log("space interaction contract tests passed");
