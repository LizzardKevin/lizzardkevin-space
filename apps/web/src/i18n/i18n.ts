import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { generatedResources } from "../generated/i18nResources.generated.ts";
import { readInitialLanguage } from "./resolveInitialLanguage";

export const resources = generatedResources;

i18n.use(initReactI18next).init({
  resources,
  lng: readInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

function syncDocumentLanguage(language: string | undefined) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language?.startsWith("zh") ? "zh" : "en";
}

syncDocumentLanguage(i18n.resolvedLanguage ?? i18n.language);
i18n.on("languageChanged", syncDocumentLanguage);

export default i18n;
