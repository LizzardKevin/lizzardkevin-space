import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

test("SPACE default language follows Chinese browser locales and otherwise uses English", async () => {
  const language = await importSourceModule("i18n/resolveInitialLanguage.ts");

  assert.equal(language.normalizeSupportedLanguage("zh-CN"), "zh");
  assert.equal(language.normalizeSupportedLanguage("zh-TW"), "zh");
  assert.equal(language.normalizeSupportedLanguage("zh-Hant-TW"), "zh");
  assert.equal(language.normalizeSupportedLanguage("zh-Hans-CN"), "zh");
  assert.equal(language.normalizeSupportedLanguage("en-US"), "en");
  assert.equal(language.normalizeSupportedLanguage("ja-JP"), "en");
  assert.equal(language.normalizeSupportedLanguage(undefined), "en");
});

test("SPACE stored language wins before falling back to browser language", async () => {
  const language = await importSourceModule("i18n/resolveInitialLanguage.ts");

  assert.equal(
    language.resolveInitialLanguage({
      storedLanguage: "zh",
      navigatorLanguages: ["en-US"],
      navigatorLanguage: "en-US",
    }),
    "zh",
  );
  assert.equal(
    language.resolveInitialLanguage({
      storedLanguage: "en",
      navigatorLanguages: ["zh-CN"],
      navigatorLanguage: "zh-CN",
    }),
    "en",
  );
  assert.equal(
    language.resolveInitialLanguage({
      storedLanguage: "fr",
      navigatorLanguages: ["zh-Hant-TW", "en-US"],
      navigatorLanguage: "en-US",
    }),
    "zh",
  );
  assert.equal(
    language.resolveInitialLanguage({
      storedLanguage: null,
      navigatorLanguages: ["fr-FR", "ja-JP"],
      navigatorLanguage: "fr-FR",
    }),
    "en",
  );
});
