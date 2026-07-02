import assert from "node:assert/strict";
import { readSourceFile } from "../helpers/projectPaths.mjs";

const splitTabs = readSourceFile("components/frostedSplit/FrostedSplitTabs.tsx");
const splitData = readSourceFile("components/frostedSplit/splitArchiveData.ts");
const profile = readSourceFile("content/lizzardKevinProfile.ts");
const devStories = readSourceFile("content/devStories.ts");

assert(
  splitTabs.includes("useTranslation") &&
    splitTabs.includes("normalizeSupportedLanguage") &&
    splitTabs.includes("buildSplitArchivePanels(activeLanguage)"),
  "Frosted Split must rebuild profile/devstory data from the active language",
);
assert(
  splitData.includes("export function buildSplitArchivePanels") &&
    splitData.includes("language: SupportedLanguage"),
  "Frosted Split data must expose a language-aware builder",
);

for (const source of [profile, devStories]) {
  assert(source.includes("en:") && source.includes("zh:"), "profile and DevStories data must carry bilingual copy");
}

for (const localizedNeedle of [
  "currentSignal",
  "spaceLayer",
  "archiveNote",
  "whatITuned",
  "whatGotWeird",
  "nextNote",
]) {
  assert(splitData.includes(localizedNeedle), `split archive copy must localize ${localizedNeedle}`);
}

console.log("frosted split i18n runtime contract tests passed");
