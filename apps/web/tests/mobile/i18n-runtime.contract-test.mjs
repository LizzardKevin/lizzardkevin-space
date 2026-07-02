import assert from "node:assert/strict";
import { files, mobileData } from "../helpers/mobileContractFixture.mjs";

assert(
  files.mobileExperience.includes('import { normalizeSupportedLanguage, readInitialLanguage } from "../i18n/resolveInitialLanguage"'),
  "mobile terminal must use the shared initial language resolver",
);
assert(
  files.mobileExperience.includes("readInitialLanguage()"),
  "mobile terminal default language must follow stored/global/browser language fallback",
);
const sharedLanguageReadIndex = files.mobileExperience.indexOf('const sharedValue = safeReadStorageItem("lang")');
const mobileLanguageReadIndex = files.mobileExperience.indexOf("const mobileValue = safeReadStorageItem(LANGUAGE_STORAGE_KEY)");
assert(
  sharedLanguageReadIndex >= 0 &&
    mobileLanguageReadIndex >= 0 &&
    sharedLanguageReadIndex < mobileLanguageReadIndex,
  "mobile terminal must prefer shared lang storage before mobile-only language storage",
);
assert(
  files.mobileExperience.includes("i18n.changeLanguage(next)") &&
    files.mobileExperience.includes('safeWriteStorageItem("lang", next)'),
  "mobile language toggle must keep the shared i18n language in sync",
);
assert(
  files.mobileExperience.includes('i18n.on("languageChanged", syncLanguage)') &&
    files.mobileExperience.includes('i18n.off("languageChanged", syncLanguage)') &&
    files.mobileExperience.includes("setLanguageState(nextLanguage)") &&
    files.mobileExperience.includes("safeWriteStorageItem(LANGUAGE_STORAGE_KEY, nextLanguage)"),
  "mobile terminal must subscribe to shared i18n language changes while mounted",
);

for (const group of ["aria", "projectDetails"]) {
  assert(mobileData.includes(`${group}: {`), `mobile localized copy must include ${group}`);
}

for (const sourceNeedle of [
  "copy.aria.settings",
  "copy.aria.sections",
  "copy.aria.museum",
  "copy.aria.loading",
  "copy.aria.idle",
  "copy.projectDetails.currentSignal",
  "copy.projectDetails.spaceLayer",
  "copy.projectDetails.archiveNote",
  "copy.projectDetails.tags",
  "copy.projectDetails.media",
  "copy.projectDetails.imageAlt",
]) {
  assert(
    files.mobileExperience.includes(sourceNeedle),
    `mobile runtime must render localized ${sourceNeedle}`,
  );
}

for (const hardcoded of [
  'aria-label="Terminal settings"',
  'aria-label="Mobile terminal sections"',
  'aria-label="Mobile terminal museum"',
  'aria-label="Mobile terminal loading"',
  "Mobile terminal idle",
  "<dt>Current Signal</dt>",
  "<dt>SPACE Layer</dt>",
  "<dt>Archive Note</dt>",
  "`${project.title} tags`",
  "`${project.title} media`",
  "`${project.title} image ${index + 1}`",
]) {
  assert(!files.mobileExperience.includes(hardcoded), `mobile runtime must not hardcode ${hardcoded}`);
}

console.log("mobile i18n runtime contract tests passed");
