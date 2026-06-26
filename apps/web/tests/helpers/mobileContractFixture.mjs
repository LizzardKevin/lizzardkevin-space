import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { projectPath, readProjectFile } from "./projectPaths.mjs";

export function terminalCssSlice(css) {
  const start = css.indexOf(".mobile-terminal-site");
  assert.notEqual(start, -1, "mobile terminal CSS root class must exist");
  const end = css.indexOf(".playback-bar", start);
  assert.notEqual(end, -1, "mobile terminal CSS must end before desktop playback CSS");
  return end === -1 ? css.slice(start) : css.slice(start, end);
}

export const files = {
  app: readProjectFile("apps/web/src/App.tsx"),
  spacePage: readProjectFile("apps/web/src/pages/SpacePage.tsx"),
  mobileExperience: readProjectFile("apps/web/src/pages/MobileExperience.tsx"),
  profile: readProjectFile("apps/web/src/content/lizzardKevinProfile.ts"),
  css: readProjectFile("apps/web/src/styles/global.css"),
};

const mobileDataPath = projectPath("apps/web/src/mobile/mobileArchiveData.ts");
assert(existsSync(mobileDataPath), "mobile archive data module must exist");
export const mobileData = readFileSync(mobileDataPath, "utf8").replace(/\r\n/g, "\n");
export const terminalCss = terminalCssSlice(files.css);
