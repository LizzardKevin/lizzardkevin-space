import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  normalizeSupportedLanguage,
  type SupportedLanguage,
} from "../i18n/resolveInitialLanguage";

/** 订阅 i18next 当前语言（归一化为 zh/en），语言切换时触发重渲染。 */
export function usePageLanguage(): SupportedLanguage {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState<SupportedLanguage>(() =>
    normalizeSupportedLanguage(i18n.resolvedLanguage ?? i18n.language),
  );

  useEffect(() => {
    const sync = (next: string) => setLanguage(normalizeSupportedLanguage(next));
    sync(i18n.resolvedLanguage ?? i18n.language);
    i18n.on("languageChanged", sync);
    return () => {
      i18n.off("languageChanged", sync);
    };
  }, [i18n]);

  return language;
}
