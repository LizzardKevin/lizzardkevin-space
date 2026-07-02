import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { projectPath, readProjectFile } from "../helpers/projectPaths.mjs";

const devStories = readProjectFile("apps/web/src/content/devStories.ts");
const splitArchiveData = readProjectFile("apps/web/src/components/frostedSplit/splitArchiveData.ts");
const devStoriesGuide = readProjectFile("docs/devstories.md");
const devLog8 = readProjectFile("docs/devlog/DevLog_8.md");
const devLogSum8 = readProjectFile("docs/devlog/DevLogSum_8.md");

assert.ok(existsSync(projectPath("docs/devlog/DevLog_8.md")), "full DevLog 8 must exist");
assert.ok(existsSync(projectPath("docs/devlog/DevLogSum_8.md")), "summary DevLog 8 must exist");
assert(devStories.includes('id: "devlog-08"'), "web DevStories data must include DevLog 8");
assert(devStories.includes('number: "08"'), "web DevStories data must number DevLog 8");
assert(devStories.includes("我"), "web DevStories copy should read like a personal creator log");
assert(
  devStories.includes("严重性能问题") &&
    devLog8.includes("严重性能问题") &&
    devLogSum8.includes("严重性能问题"),
  "latest DevStories copy must name the current severe performance problem",
);
for (const source of [devStories, devLog8, devLogSum8]) {
  assert(
    !source.includes("语气") && !source.includes("工程账本") && !source.includes("Tone"),
    "latest DevStories copy should not describe rewriting the DevStories tone",
  );
}
assert(
  splitArchiveData.includes("const match = text.match(/^.*?[。.!?！？]/);"),
  "DevStories stage previews must trim after the first Chinese or English sentence",
);

for (const [copyKey, label] of [
  ["whatITuned", "What I tuned"],
  ["whatGotWeird", "What got weird"],
  ["nextNote", "Next note"],
]) {
  assert(splitArchiveData.includes(`${copyKey}: "${label}"`), `DevStories detail copy must include ${label}`);
  assert(splitArchiveData.includes(`copy.${copyKey}`), `DevStories detail label must render localized ${copyKey}`);
}

for (const oldLabel of ["Built", "Trouble / Rollback", 'title: "Next"', "process ledger"]) {
  assert(!splitArchiveData.includes(oldLabel), `DevStories surface must not use old changelog label ${oldLabel}`);
}

assert(
  devStoriesGuide.includes("DevLog_N.md") && devStoriesGuide.includes("DevLogSum_N.md"),
  "DevStories maintenance guide must describe both full and summary files",
);

console.log("devstories content contract tests passed");
