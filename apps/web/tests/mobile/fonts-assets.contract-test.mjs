import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { files, terminalCss } from "../helpers/mobileContractFixture.mjs";
import { projectPath } from "../helpers/projectPaths.mjs";

assert(files.css.includes("@font-face"), "mobile terminal CSS must self-host web fonts");
assert(files.css.includes("Ubuntu Mono Web"), "mobile CSS must define the Ubuntu Mono web font");
assert(files.css.includes("/fonts/ubuntu-mono/"), "Ubuntu Mono must load from local public font assets");
assert(!files.css.includes("Sarasa"), "mobile CSS must not reference Sarasa fonts");
assert(!files.css.includes("/fonts/sarasa-mono-sc/"), "Sarasa font assets must not be loaded");
assert(terminalCss.includes('--terminal-font-en: "Ubuntu Mono Web"'), "English mode must use Ubuntu Mono Web first");
assert(terminalCss.includes('--terminal-font-zh: "PingFang SC"'), "Chinese mode must use system Chinese fonts first");
assert(terminalCss.includes("--terminal-ui-font"), "terminal CSS must separate UI font from body copy font");
assert(terminalCss.includes("--terminal-body-font"), "terminal CSS must expose a body copy font variable");
assert(terminalCss.includes('font-family: var(--terminal-body-font)'), "Chinese body copy must be able to use system Chinese fonts");
assert(!terminalCss.includes('--terminal-font: var(--terminal-font-zh)'), "Chinese mode must not switch every terminal title/control to system Chinese");
assert(terminalCss.includes('"Microsoft YaHei"'), "Chinese mode must include common system Chinese fallbacks");

for (const fontPath of [
  "apps/web/public/fonts/ubuntu-mono/UbuntuMono-Regular.woff2",
  "apps/web/public/fonts/ubuntu-mono/UbuntuMono-Bold.woff2",
  "apps/web/public/fonts/ubuntu-mono/LICENSE.txt",
]) {
  const url = projectPath(fontPath);
  assert(existsSync(url), `${fontPath} must exist for self-hosted terminal fonts`);
}

const sarasaDirectory = projectPath("apps/web/public/fonts/sarasa-mono-sc");
assert(!existsSync(sarasaDirectory), "Sarasa font directory must be removed to release mobile bundle space");

assert(files.profile.includes("lizzardKevinSections"), "profile sections must remain available for desktop profile reuse");

console.log("mobile fonts and assets contract tests passed");
