import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { cssBlock, cssRule, declarationValue } from "../helpers/cssAssertions.mjs";
import {
  importSourceModule,
  projectPath,
  readProjectFile,
} from "../helpers/projectPaths.mjs";

const tokenPath = "apps/web/src/space/spaceVisualTokens.ts";
assert.ok(existsSync(projectPath(tokenPath)), `${tokenPath} must be the visual-system authority`);

const { SPACE_VISUAL_CSS_PROPERTIES, SPACE_VISUAL_TOKENS } = await importSourceModule(
  "space/spaceVisualTokens.ts",
);

assert.deepEqual(SPACE_VISUAL_TOKENS.colors, {
  brandTeal: "#67c2be",
  ink: "#17282a",
  paper: "#f3f0e7",
  atmosphere: "#a9bfbc",
  architecture: "#c7d0cc",
  wall: "#9eaeaa",
  floor: "#3f4d4d",
  ceiling: "#e8e4d8",
  metal: "#667271",
  signal: "#ef8b61",
});
assert.deepEqual(SPACE_VISUAL_TOKENS.toonBands, {
  shadow: "#31413f",
  mid: "#69827e",
  light: "#b9cbc6",
  highlight: "#f3f0e7",
});
assert.deepEqual(SPACE_VISUAL_TOKENS.fog, {
  density: 0.008,
  near: 12,
  far: 42,
});
assert.deepEqual(SPACE_VISUAL_TOKENS.lighting, {
  ambientIntensity: 0.28,
  hemisphere: { sky: "#dce9e4", ground: "#3f4d4d", intensity: 0.55 },
  key: { position: [-8, 5, 6], color: "#f3f0e7", intensity: 1 },
  fill: { position: [5, 3, -7], color: "#67c2be", intensity: 0.22 },
});
assert.deepEqual(SPACE_VISUAL_TOKENS.hud, {
  topPx: 8,
  heightPx: 36,
  panelMaxWidthPx: 360,
  panelPaddingPx: 12,
  rowGapPx: 10,
  controlMinHeightPx: 32,
  settingsSizePx: 32,
  fontSizePx: 13,
  panelFontSizePx: 12,
  fontWeight: 650,
  letterSpacingEm: 0.08,
  focusOutlinePx: 3,
  focusOffsetPx: 3,
});

assert.deepEqual(SPACE_VISUAL_CSS_PROPERTIES, {
  "--space-brand-teal": "#67c2be",
  "--space-ink": "#17282a",
  "--space-paper": "#f3f0e7",
  "--space-atmosphere": "#a9bfbc",
  "--space-architecture": "#c7d0cc",
  "--space-wall": "#9eaeaa",
  "--space-floor": "#3f4d4d",
  "--space-ceiling": "#e8e4d8",
  "--space-metal": "#667271",
  "--space-signal": "#ef8b61",
  "--space-hud-surface": "rgb(23 40 42 / 0.78)",
  "--space-hud-panel": "rgb(23 40 42 / 0.94)",
  "--space-hud-border": "rgb(243 240 231 / 0.28)",
  "--space-hud-panel-border": "rgb(243 240 231 / 0.22)",
  "--space-hud-selected": "rgb(103 194 190 / 0.28)",
});

function relativeLuminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((part) => Number.parseInt(part, 16) / 255);
  const linear = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function contrastRatio(foreground, background) {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

assert.ok(contrastRatio(SPACE_VISUAL_TOKENS.colors.paper, SPACE_VISUAL_TOKENS.colors.ink) >= 4.5);
assert.ok(contrastRatio(SPACE_VISUAL_TOKENS.colors.ink, SPACE_VISUAL_TOKENS.colors.brandTeal) >= 4.5);

const config = await importSourceModule("scenes/gallery/galleryConfig.ts");
assert.equal(config.GALLERY_TOON.background, SPACE_VISUAL_TOKENS.colors.atmosphere);
assert.equal(config.GALLERY_TOON.fogColor, SPACE_VISUAL_TOKENS.colors.atmosphere);
assert.equal(config.GALLERY_TOON.fogDensity, SPACE_VISUAL_TOKENS.fog.density);
assert.deepEqual(config.GALLERY_TOON.gradientStops, SPACE_VISUAL_TOKENS.toonBands);
assert.deepEqual(config.GALLERY_TOON.stylizedMaterials, {
  architecture: SPACE_VISUAL_TOKENS.colors.architecture,
  floor: SPACE_VISUAL_TOKENS.colors.floor,
  stair: SPACE_VISUAL_TOKENS.colors.floor,
  wall: SPACE_VISUAL_TOKENS.colors.wall,
  ceiling: SPACE_VISUAL_TOKENS.colors.ceiling,
});
assert.equal(config.GALLERY_ALUMINUM_MATERIAL.color, SPACE_VISUAL_TOKENS.colors.metal);
assert.equal("ENABLE_GALLERY_BLOOM" in config, false, "quality config must be the sole bloom authority");
assert.equal("GALLERY_BLOOM" in config, false, "dead bloom values must not contradict the quality profile");

const desktopApp = readProjectFile("apps/web/src/app/DesktopApp.tsx");
const session = readProjectFile("apps/web/src/space/SpaceSession.tsx");
const spaceScene = readProjectFile("apps/web/src/scenes/SpaceScene.tsx");
const galleryModel = readProjectFile("apps/web/src/scenes/gallery/GalleryModel.tsx");
const materials = readProjectFile("apps/web/src/scenes/gallery/galleryStyleMaterials.ts");
const player = readProjectFile("apps/web/src/scenes/Player/PlayerController.tsx");
const css = readProjectFile("apps/web/src/styles/global.css");
const packageJson = JSON.parse(readProjectFile("package.json"));

assert.match(
  packageJson.scripts["test:contracts"],
  /node apps\/web\/tests\/space\/visual-system\.contract-test\.mjs/,
  "the release-reachable contract suite must execute the visual-system contract",
);
assert.match(
  packageJson.scripts["verify:quick"],
  /npm run test:contracts/,
  "verify:quick must retain the release path to visual-system contracts",
);
assert.match(
  packageJson.scripts["test:browser-baseline"],
  /apps\/web\/tests\/performance\/browser-baseline\.test\.mjs/,
);
assert.match(
  packageJson.scripts["posttest:browser-baseline"],
  /apps\/web\/tests\/performance\/browser-candidate-report\.test\.mjs/,
  "the manual browser-report lifecycle must validate both baseline and candidate evidence",
);

assert.match(desktopApp, /SPACE_VISUAL_CSS_PROPERTIES/);
assert.match(desktopApp, /className="desktop-app"/);
assert.match(desktopApp, /style=\{\{[\s\S]*\.\.\.SPACE_VISUAL_CSS_PROPERTIES/);
assert.equal((session.match(/<GalleryAtmosphere\s*\/>/g) ?? []).length, 1);
assert.doesNotMatch(session, /expensiveLeaves\.galleryAtmosphere/);
assert.match(session, /<SpaceScene[\s\S]*profile=\{profile\}/);
assert.match(spaceScene, /<GalleryModel[\s\S]*profile=\{profile\}/);
assert.match(galleryModel, /profile\.expensiveLeaves\.galleryPointLights/);
assert.match(galleryModel, /GALLERY_BULB\.maxCount/);
assert.doesNotMatch(materials, /neutralizeColor|neutralizeMaterial/);
assert.match(materials, /function applyGalleryPreservedMaterialStyle/);
assert.doesNotMatch(materials, /applyGalleryNeutralMaterialTone/);
assert.match(player, /resolveSpaceMotionPolicy/);
assert.match(player, /allowIdleCameraDrift/);

const topbar = cssRule(css, ".topbar");
const cluster = cssRule(css, ".topbar__cluster");
const button = cssRule(css, ".topbar__button");
const settings = cssRule(css, ".topbar__settingsButton");
const panel = cssRule(css, ".topbar__settingsPanel");
const selected = cssRule(css, '.topbar__settingsSegment button[aria-pressed="true"]');

assert.equal(declarationValue(topbar, "top"), "8px");
assert.equal(declarationValue(topbar, "height"), "36px");
assert.equal(declarationValue(cluster, "background"), "var(--space-hud-surface)");
assert.equal(declarationValue(cluster, "border"), "1px solid var(--space-hud-border)");
assert.equal(declarationValue(cluster, "border-radius"), "0");
assert.equal(declarationValue(button, "min-height"), "32px");
assert.equal(declarationValue(button, "color"), "var(--space-paper)");
assert.equal(declarationValue(button, "font-size"), "13px");
assert.equal(declarationValue(button, "font-weight"), "650");
assert.equal(declarationValue(button, "mix-blend-mode"), "normal");
assert.equal(declarationValue(button, "text-shadow"), "none");
assert.equal(declarationValue(settings, "width"), "32px");
assert.equal(declarationValue(settings, "height"), "32px");
assert.equal(declarationValue(settings, "border-radius"), "0");
assert.equal(declarationValue(panel, "width"), "calc(100vw - 32px)");
assert.equal(declarationValue(panel, "max-width"), "360px");
assert.equal(
  declarationValue(panel, "box-sizing"),
  "border-box",
  "the 360px settings-panel limit must include padding and border",
);
assert.equal(
  declarationValue(panel, "left"),
  "clamp(16px, calc(50% + 44px), calc(100% - 376px))",
  "the panel must preserve its right-side composition while clamping to a 16px viewport gutter",
);
assert.equal(declarationValue(panel, "transform"), "none");
assert.equal(declarationValue(panel, "padding"), "12px");
assert.equal(declarationValue(panel, "gap"), "10px");
assert.equal(declarationValue(panel, "background"), "var(--space-hud-panel)");
assert.equal(declarationValue(panel, "border"), "1px solid var(--space-hud-panel-border)");
assert.equal(declarationValue(panel, "border-radius"), "0");
assert.equal(declarationValue(panel, "font-size"), "12px");
assert.equal(declarationValue(selected, "background"), "var(--space-hud-selected)");
assert.equal(declarationValue(selected, "color"), "var(--space-paper)");

for (const selector of [
  ".topbar__button:focus-visible",
  ".topbar__settingsButton:focus-visible",
  ".topbar__settingsSegment button:focus-visible",
  ".playback-bar__track:focus-visible",
  ".space-boot-failure button:focus-visible",
]) {
  const rule = cssBlock(css, selector);
  assert.equal(declarationValue(rule, "outline"), "3px solid var(--space-paper)", selector);
  assert.equal(declarationValue(rule, "outline-offset"), "3px", selector);
}

assert.match(
  css,
  /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.space-onboarding-sign,[\s\S]*?animation: none !important;[\s\S]*?\.space-cursor-dot,[\s\S]*?\.crosshair,[\s\S]*?transition: none;/,
);

console.log("SPACE visual system contract tests passed");
