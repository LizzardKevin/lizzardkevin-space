export type SupportedLanguage = "zh" | "en";

function isChineseLocale(language: string) {
  const normalized = language.trim().toLowerCase();
  return normalized === "zh" || normalized.startsWith("zh-");
}

export function normalizeSupportedLanguage(language: string | null | undefined): SupportedLanguage {
  if (!language) return "en";
  return isChineseLocale(language) ? "zh" : "en";
}

function normalizeStoredLanguage(language: string | null | undefined): SupportedLanguage | null {
  if (language === "zh" || language === "en") return language;
  return null;
}

export function resolveInitialLanguage({
  storedLanguage,
  navigatorLanguages,
  navigatorLanguage,
}: {
  storedLanguage?: string | null;
  navigatorLanguages?: readonly string[];
  navigatorLanguage?: string | null;
}): SupportedLanguage {
  const stored = normalizeStoredLanguage(storedLanguage);
  if (stored) return stored;

  const candidates = [...(navigatorLanguages ?? []), navigatorLanguage].filter(
    (language): language is string => typeof language === "string" && language.length > 0,
  );

  return candidates.some(isChineseLocale) ? "zh" : "en";
}

export function readInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "en";

  const storedLanguage = (() => {
    try {
      return window.localStorage.getItem("lang");
    } catch {
      return null;
    }
  })();

  return resolveInitialLanguage({
    storedLanguage,
    navigatorLanguages: window.navigator.languages,
    navigatorLanguage: window.navigator.language,
  });
}
