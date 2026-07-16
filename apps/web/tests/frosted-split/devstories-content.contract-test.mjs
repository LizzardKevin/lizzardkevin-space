import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { projectPath, readProjectFile } from "../helpers/projectPaths.mjs";

const devStories = readProjectFile("apps/web/src/generated/devStories.generated.ts").replace(
  /"([A-Za-z_$][\w$]*)":/g,
  "$1:",
);
const splitArchiveData = readProjectFile("apps/web/src/components/frostedSplit/splitArchiveData.ts");
const splitArchiveCopy = readProjectFile("apps/web/src/generated/splitArchiveCopy.generated.ts").replace(
  /"([A-Za-z_$][\w$]*)":/g,
  "$1:",
);
const devStoriesGuide = readProjectFile("docs/devstories.md");
const devLog8 = readProjectFile("docs/devlog/DevLog_8.md");
const devLogSum8 = readProjectFile("docs/devlog/DevLogSum_8.md");
const devLog9Path = "docs/devlog/DevLog_9.md";
const devLogSum9Path = "docs/devlog/DevLogSum_9.md";

assert.ok(existsSync(projectPath("docs/devlog/DevLog_8.md")), "full DevLog 8 must exist");
assert.ok(existsSync(projectPath("docs/devlog/DevLogSum_8.md")), "summary DevLog 8 must exist");
assert(devStories.includes('id: "devlog-08"'), "web DevStories data must include DevLog 8");
assert(devStories.includes('number: "08"'), "web DevStories data must number DevLog 8");
assert.ok(existsSync(projectPath(devLog9Path)), "full DevLog 9 must exist");
assert.ok(existsSync(projectPath(devLogSum9Path)), "summary DevLog 9 must exist");
const devLog9 = readProjectFile(devLog9Path);
const devLogSum9 = readProjectFile(devLogSum9Path);
assert(devStories.includes('id: "devlog-09"'), "web DevStories data must include DevLog 9");
assert(devStories.includes('number: "09"'), "web DevStories data must number DevLog 9");
assert(devStories.includes('period: "2026.07.15"'), "web DevStories data must date DevLog 9");
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
for (const source of [devStories, devLog9, devLogSum9]) {
  assert(source.includes("Architecture V2"), "DevLog 9 must document the Architecture V2 migration");
}
assert(
  devLog9.includes("DevLog 8") && devLog9.includes("上一版"),
  "DevLog 9 must explicitly compare this pass with DevLog 8",
);
assert(
  splitArchiveData.includes("const match = text.match(/^.*?[。.!?！？]/);"),
  "DevStories stage previews must trim after the first Chinese or English sentence",
);

for (const [copyKey, label] of [
  ["whatITuned", "What I tuned"],
  ["whatGotWeird", "What got weird"],
  ["nextNote", "Next note"],
]) {
  assert(splitArchiveCopy.includes(`${copyKey}: "${label}"`), `DevStories detail copy must include ${label}`);
  assert(splitArchiveData.includes(`copy.${copyKey}`), `DevStories detail label must render localized ${copyKey}`);
}

for (const oldLabel of ["Built", "Trouble / Rollback", 'title: "Next"', "process ledger"]) {
  assert(!splitArchiveData.includes(oldLabel), `DevStories surface must not use old changelog label ${oldLabel}`);
}

assert(
  devStoriesGuide.includes("DevLog_N.md") && devStoriesGuide.includes("DevLogSum_N.md"),
  "DevStories maintenance guide must describe both full and summary files",
);
assert(
  devStoriesGuide.includes("space-exhibit-index.xlsx") && devStoriesGuide.includes("content:generate"),
  "DevStories maintenance guide must point to the workbook source and generation command",
);

console.log("devstories content contract tests passed");
