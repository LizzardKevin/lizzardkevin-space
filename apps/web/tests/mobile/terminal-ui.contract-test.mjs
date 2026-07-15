import assert from "node:assert/strict";
import { files, terminalCss } from "../helpers/mobileContractFixture.mjs";

assert(terminalCss.includes("--terminal-collapse"), "terminal CSS must expose scroll-driven collapse variables");
assert(terminalCss.includes("--terminal-content-scroll-y"), "terminal CSS must expose document scroll-follow offset");
assert(terminalCss.includes("--terminal-nav-scroll-y"), "terminal CSS must expose main tab scroll-follow offset");
assert(terminalCss.includes("transform: translate3d(0, var(--terminal-nav-scroll-y), 0)"), "main tabs must move with the user's scroll during header collapse");
assert(terminalCss.includes("transform: translate3d(0, var(--terminal-content-scroll-y), 0)"), "terminal documents must move one-to-one with the user's scroll during header collapse");
assert(terminalCss.includes(".mobile-terminal-loadLayer"), "terminal CSS must include a separate inner text-load animation layer");
assert(terminalCss.includes("color-mix(in srgb, var(--terminal-text)"), "collapsed Space color must interpolate toward the muted small-label color");
assert(terminalCss.includes("var(--terminal-muted) calc(var(--terminal-collapse) * 100%)"), "collapsed Space final color must match the small-label muted color");
assert(terminalCss.includes(".mobile-terminal-fold"), "terminal CSS must include markdown-style fold sections");
assert(terminalCss.includes(".mobile-terminal-fold summary"), "terminal CSS must style fold summaries");
assert(terminalCss.includes(".mobile-terminal-fold__body"), "terminal CSS must include fold body animation wrappers");
assert(terminalCss.includes("grid-template-rows"), "fold animation must use grid rows for expand and collapse");
assert(terminalCss.includes("cubic-bezier(0.22, 1, 0.36, 1)"), "fold animation must use a nonlinear easing curve");
assert(terminalCss.includes("grid-template-rows 180ms"), "fold expand and collapse animation must be fast");
assert(terminalCss.includes(".mobile-terminal-fold summary::-webkit-details-marker"), "terminal CSS must hide the default details marker");
assert(terminalCss.includes('.mobile-terminal-fold summary::before'), "terminal CSS must add terminal text fold markers");
assert(terminalCss.includes('.mobile-terminal-fold[data-fold-state="open"] summary::before'), "terminal CSS must distinguish open fold state");
assert(terminalCss.includes('.mobile-terminal-fold[data-fold-state="closed"] .mobile-terminal-fold__body'), "terminal CSS must keep closed fold bodies mounted for the closing animation");
assert(terminalCss.includes(".mobile-skill-module"), "Skills.md CSS must include terminal module wrappers");
assert(terminalCss.includes(".mobile-skill-module__prompt"), "Skills.md CSS must include terminal prompt styling");
const skillSummaryRule = terminalCss.match(/\.mobile-skill-list span\s*\{[\s\S]*?\}/)?.[0] ?? "";
assert(skillSummaryRule, "Skills.md summary text must have a dedicated CSS rule");
assert(skillSummaryRule.includes("font-size: 12px"), "Skills.md summary text must be smaller than regular body copy");
assert(skillSummaryRule.includes("line-height: 1.48"), "Skills.md summary text must use tighter terminal document leading");
assert(skillSummaryRule.includes("color: var(--terminal-muted)"), "Skills.md summary text must use muted gray instead of pure terminal text");
assert(skillSummaryRule.includes("font-family: var(--terminal-body-font)"), "Skills.md summary text must keep the body font stack");
assert(terminalCss.includes(".mobile-project-detail__notes dd"), "project detail body copy must keep its existing shared body rule");
assert(terminalCss.includes(".mobile-resume-block p"), "Soul.md body copy must keep its existing shared body rule");
assert(terminalCss.includes(".mobile-contact-lines strong"), "Contact.md body copy must keep its existing shared body rule");
assert(terminalCss.includes(".mobile-terminal-themeReveal"), "terminal CSS must include theme reveal overlay");
assert(terminalCss.includes(".mobile-terminal-site--light"), "terminal CSS must include an explicit light theme class for white background and black text");
assert(terminalCss.includes("--terminal-accent: #2f7775"), "light terminal theme must expose a readable blue-green accent");
assert(terminalCss.includes("--terminal-accent: #67c2be"), "dark terminal theme must expose the brighter blue-green accent");
assert(terminalCss.includes("--terminal-accent-fill: #67c2be"), "selected controls must use the branded blue-green fill");
assert(terminalCss.includes("--terminal-accent-ink: #101010"), "accent fills must keep dark readable ink");
assert(terminalCss.includes(".mobile-terminal-row--active strong"), "active terminal navigation must keep its dedicated rule");
assert(terminalCss.includes("background: var(--terminal-accent-fill)"), "active terminal navigation must use the theme accent");
assert(terminalCss.includes(".mobile-terminal-command"), "terminal command must keep its dedicated rule");
assert(terminalCss.includes("color: var(--terminal-accent)"), "terminal commands and key interactive labels must use the theme accent");
assert(terminalCss.includes(".mobile-terminal-fold summary::before"), "fold markers must keep their dedicated rule");
assert(terminalCss.includes("clip-path: circle"), "theme reveal must use a circular expansion");
assert(terminalCss.includes("mix-blend-mode: difference"), "theme reveal must use a mask-like black/white inversion instead of a solid color wipe");
assert(!terminalCss.includes(".mobile-terminal-themeReveal--light"), "theme reveal must not switch through solid light fill classes");
assert(!terminalCss.includes(".mobile-terminal-themeReveal--dark"), "theme reveal must not switch through solid dark fill classes");
assert(terminalCss.includes("@keyframes mobile-terminal-theme-reveal"), "theme reveal must define a bounded circular animation");
assert(terminalCss.includes(".mobile-terminal-bootDots"), "terminal CSS must animate the boot loading dots");
assert(terminalCss.includes(".mobile-terminal-boot > span"), "terminal boot CSS must only block-layout the command and status rows");
assert(terminalCss.includes(".mobile-terminal-boot .mobile-terminal-bootDots"), "terminal boot dot span must override row layout and stay inline");
assert(!terminalCss.includes(".mobile-terminal-boot span,\n.mobile-terminal-boot strong"), "terminal boot CSS must not block-layout every nested dot span");
assert(terminalCss.includes("@keyframes mobile-terminal-dot-pulse"), "boot loading dots must use a repeating dot animation");
assert(terminalCss.includes("@keyframes mobile-terminal-text-load"), "terminal CSS must define the 250ms text loading animation");
assert(terminalCss.includes(".mobile-terminal-loadLayer.mobile-terminal-document--loading"), "terminal changed text animation must be scoped to the inner load layer");
assert(terminalCss.includes("animation: mobile-terminal-text-load 250ms"), "terminal changed text must animate for 250ms");
assert(!terminalCss.includes(".mobile-terminal-boot i"), "mobile terminal boot CSS must not keep the vertical cursor rule");
assert(terminalCss.includes("--terminal-project-scroll-room"), "project detail must reserve scroll room for header collapse");
assert(terminalCss.includes("min-height: calc(100% + var(--terminal-project-scroll-room))"), "project detail must stay scrollable enough to fully collapse the header");
assert(terminalCss.includes("--terminal-view-scroll-room"), "regular terminal documents must reserve scroll room for header collapse");
assert(terminalCss.includes("min-height: calc(100% + var(--terminal-view-scroll-room))"), "all terminal documents must stay scrollable enough to fully collapse the header");
assert(!terminalCss.includes(".mobile-terminal-shell--contact {\n  overflow: hidden;"), "Contact.md shell must remain scrollable so Space can collapse");
assert(!terminalCss.includes("ui-sans-serif"), "terminal CSS must not use sans-serif font stacks");
assert(!terminalCss.includes(".mobile-terminal-header--compact"), "terminal CSS must remove the old compact class");
assert(!files.mobileExperience.includes("Sarasa"), "mobile experience must not reference Sarasa fonts");
for (const requiredClass of [
  ".mobile-terminal-site",
  ".mobile-terminal-site--dark",
  ".mobile-terminal-header",
  ".mobile-terminal-settings",
  ".mobile-terminal-boot",
  ".mobile-terminal-shell",
  ".mobile-terminal-nav",
  ".mobile-terminal-row",
  ".mobile-terminal-document",
  ".mobile-terminal-document--contact",
  ".mobile-project-detail",
]) {
  assert(terminalCss.includes(requiredClass), `terminal CSS must include ${requiredClass}`);
}

for (const removedClass of [
  ".mobile-liquid-archive",
  ".mobile-white-glass-theme",
  ".mobile-glass",
  ".mobile-archive-carousel",
  ".mobile-expertise-field",
  ".mobile-noise-field",
  ".mobile-glass-vignette",
]) {
  assert(!files.css.includes(removedClass), `mobile CSS must remove ${removedClass}`);
}

for (const forbiddenCss of [
  "backdrop-filter",
  "-webkit-backdrop-filter",
  "blur(",
  "box-shadow",
  "linear-gradient",
  "radial-gradient",
  "border:",
  "outline:",
]) {
  assert(!terminalCss.includes(forbiddenCss), `terminal CSS must not include ${forbiddenCss}`);
}

console.log("mobile terminal UI contract tests passed");
