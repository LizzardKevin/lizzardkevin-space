import assert from "node:assert/strict";
import { cssRule, cssRuleInMedia } from "../helpers/cssAssertions.mjs";
import { readProjectFile } from "../helpers/projectPaths.mjs";

const startMenu = readProjectFile("apps/web/src/mobile/MobileStartMenu.tsx");
const startMenuCss = readProjectFile("apps/web/src/mobile/mobileStartMenu.css");
const mobileApp = readProjectFile("apps/web/src/app/MobileApp.tsx");
const mobileExperience = readProjectFile("apps/web/src/pages/MobileExperience.tsx");

assert.match(startMenu, /import\s+["']\.\/mobileStartMenu\.css["']/);
assert.match(startMenu, /export function MobileStartMenu/);
assert.match(startMenu, /onEnter\s*:\s*\(\)\s*=>\s*void/);
assert.equal((startMenu.match(/<button\b/g) ?? []).length, 1, "MobileStartMenu must render exactly one native button");
assert.match(startMenu, /<button[\s\S]*?type=["']button["'][\s\S]*?>[\s\S]*?Enter[\s\S]*?<\/button>/);
assert.doesNotMatch(startMenu, /role\s*=\s*["']button["']/);
assert.doesNotMatch(startMenu, /<canvas\b|<svg\b/i);

for (const eventName of ["onPointerMove", "onPointerLeave", "onPointerUp", "onPointerCancel"]) {
  assert(startMenu.includes(eventName), `MobileStartMenu must handle ${eventName}`);
}
assert.match(startMenu, /getBoundingClientRect\(\)/);
assert.match(startMenu, /Math\.min\(1,\s*Math\.max\(-1,/);
assert.match(startMenu, /\.style\.setProperty\(["']--mobile-start-pointer-x["']/);
assert.match(startMenu, /\.style\.setProperty\(["']--mobile-start-pointer-y["']/);
assert.doesNotMatch(startMenu, /\buseState\b|\buseReducer\b/);
assert.doesNotMatch(startMenu, /requestAnimationFrame|cancelAnimationFrame|setInterval|setTimeout|deviceorientation|devicemotion/i);

assert.match(startMenuCss, /min-height:\s*100dvh/);
assert.match(startMenuCss, /env\(safe-area-inset-(?:top|right|bottom|left)/);
assert.match(startMenuCss, /:focus-visible/);
assert.match(startMenuCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
assert.match(startMenuCss, /@media\s*\(orientation:\s*landscape\)[\s\S]*?max-height/);
assert.doesNotMatch(startMenuCss, /@import|url\s*\(/i);
assert.doesNotMatch(startMenuCss, /@keyframes|animation(?:-name)?:/i);
assert.match(startMenuCss, /--mobile-start-accent:\s*#67c2be/);

const stableSurfaceRule = cssRule(startMenuCss, ".mobile-start-menu");
const stableTitleRule = cssRule(startMenuCss, ".mobile-start-menu__title");
const stableTitleWordRule = cssRule(startMenuCss, ".mobile-start-menu__title strong");
const stableEnterRule = cssRule(startMenuCss, ".mobile-start-menu__enter");
const stableEnterActiveRule = cssRule(startMenuCss, ".mobile-start-menu__enter:active");
assert.doesNotMatch(stableTitleRule, /^\s*transform\s*:/m, "title must remain on a stable non-transformed layer");
assert.match(stableTitleWordRule, /font-family:\s*"Ubuntu Mono Web"/);
assert.match(stableTitleWordRule, /font-weight:\s*700/);
assert.match(stableTitleWordRule, /letter-spacing:\s*0\.045em/);
assert.match(stableTitleWordRule, /padding-right:\s*0\.045em/);
assert.doesNotMatch(stableEnterRule, /^\s*transform\s*:/m, "Enter must remain on a stable non-transformed layer");
assert.doesNotMatch(stableEnterActiveRule, /^\s*transform\s*:/m, "active Enter must not create a transient compositor layer");
assert.match(stableSurfaceRule, /radial-gradient\(/);
assert.match(stableSurfaceRule, /#f7f7f2/);
assert.match(stableSurfaceRule, /var\(--mobile-start-pointer-x\)/);
assert.match(stableSurfaceRule, /var\(--mobile-start-pointer-y\)/);
const reducedSurfaceRule = cssRuleInMedia(startMenuCss, "prefers-reduced-motion: reduce", ".mobile-start-menu");
assert.match(reducedSurfaceRule, /--mobile-start-pointer-x:\s*0\s*!important/);
assert.match(reducedSurfaceRule, /--mobile-start-pointer-y:\s*0\s*!important/);

assert.match(mobileApp, /import\s*\{\s*useState\s*\}\s*from\s*["']react["']/);
assert.match(mobileApp, /const\s*\[mobileStarted,\s*setMobileStarted\]\s*=\s*useState\(false\)/);
assert.equal((mobileApp.match(/setMobileStarted\(/g) ?? []).length, 1, "mobileStarted must only transition once from Enter");
assert.match(
  mobileApp,
  /if\s*\(!mobileStarted\)\s*\{[\s\S]*?if\s*\(aliasRedirectTo\)\s*return\s*<Navigate replace to=\{aliasRedirectTo\}\s*\/>;[\s\S]*?return\s*<MobileStartMenu\s+onEnter=\{handleEnter\}\s*\/>;[\s\S]*?\}/,
);
assert.match(mobileApp, /const\s+handleEnter\s*=\s*\(\)\s*=>\s*\{\s*setMobileStarted\(true\);?\s*\}/);
assert.doesNotMatch(mobileApp, /EntrySplash|useEntryTransition|useAudioDirector/);
assert.doesNotMatch(mobileApp, /\bNotFound\b/);
assert(
  mobileApp.indexOf("if (!mobileStarted)") < mobileApp.indexOf("<PersistentMobileExperienceBoundary"),
  "terminal boundary must not mount before Enter",
);
assert.match(mobileApp, /aliasRedirectTo\s*\?\s*<Navigate replace to=\{aliasRedirectTo\}/);
assert.doesNotMatch(mobileApp, /key=\{(?:route|view|location|mobileStarted)/);

assert.doesNotMatch(mobileExperience, /EntryTransition|\bentry\s*[:},]|\bentered\b/);
assert.match(mobileExperience, /useEffect\(\(\)\s*=>\s*\{\s*let cancelled = false;[\s\S]*?loadTerminalFonts\(bootLanguage\)/);
assert.match(mobileExperience, /\},\s*\[bootLanguage\]\);/);
assert.doesNotMatch(mobileExperience, /if\s*\(!entered\)/);

console.log("mobile start menu contract tests passed");
