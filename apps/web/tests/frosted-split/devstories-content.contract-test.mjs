import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { projectPath, readProjectFile } from "../helpers/projectPaths.mjs";

const devStories = readProjectFile("apps/web/src/content/devStories.ts");
const splitArchiveData = readProjectFile("apps/web/src/components/frostedSplit/splitArchiveData.ts");
const devStoriesGuide = readProjectFile("docs/devstories.md");

assert.ok(existsSync(projectPath("docs/devlog/DevLog_8.md")), "full DevLog 8 must exist");
assert.ok(existsSync(projectPath("docs/devlog/DevLogSum_8.md")), "summary DevLog 8 must exist");
assert(devStories.includes('id: "devlog-08"'), "web DevStories data must include DevLog 8");
assert(devStories.includes('number: "08"'), "web DevStories data must number DevLog 8");
assert(devStories.includes("我"), "web DevStories copy should read like a personal creator log");
assert(
  splitArchiveData.includes("const match = text.match(/^.*?[。.!?！？]/);"),
  "DevStories stage previews must trim after the first Chinese or English sentence",
);

for (const label of ["What I tuned", "What got weird", "Next note"]) {
  assert(splitArchiveData.includes(`title: "${label}"`), `DevStories detail label must include ${label}`);
}

for (const oldLabel of ["Built", "Trouble / Rollback", 'title: "Next"', "process ledger"]) {
  assert(!splitArchiveData.includes(oldLabel), `DevStories surface must not use old changelog label ${oldLabel}`);
}

assert(
  devStoriesGuide.includes("DevLog_N.md") && devStoriesGuide.includes("DevLogSum_N.md"),
  "DevStories maintenance guide must describe both full and summary files",
);

console.log("devstories content contract tests passed");
