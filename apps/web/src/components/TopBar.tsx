import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { OverlayTab } from "../overlay/OverlayState";

type SupportedLanguage = "zh" | "en";

function normalizeLanguage(language: string | undefined): SupportedLanguage {
  return language?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function TopButton({
  label,
  onClick,
  spaceWordOrigin = false,
}: {
  label: string;
  onClick: () => void;
  spaceWordOrigin?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="topbar__button"
    >
      <span data-space-word-origin={spaceWordOrigin ? "true" : undefined}>{label}</span>
    </button>
  );
}

export function TopBar({
  onOpenTab,
  onCloseTab,
}: {
  onOpenTab: (tab: Exclude<OverlayTab, null>) => void;
  onCloseTab: () => void;
}) {
  const { i18n, t } = useTranslation();
  const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>(() =>
    normalizeLanguage(i18n.resolvedLanguage ?? i18n.language),
  );
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  useEffect(() => {
    const syncLanguage = (language: string) => {
      const next = normalizeLanguage(language);
      setActiveLanguage(next);
      document.documentElement.lang = next;
    };

    syncLanguage(i18n.resolvedLanguage ?? i18n.language);
    i18n.on("languageChanged", syncLanguage);
    return () => {
      i18n.off("languageChanged", syncLanguage);
    };
  }, [i18n]);

  const toggleLanguage = useCallback(async () => {
    if (isChangingLanguage) return;
    const next: SupportedLanguage = activeLanguage === "zh" ? "en" : "zh";
    setIsChangingLanguage(true);
    try {
      await i18n.changeLanguage(next);
      localStorage.setItem("lang", next);
      document.documentElement.lang = next;
      setActiveLanguage(next);
    } finally {
      setIsChangingLanguage(false);
    }
  }, [activeLanguage, i18n, isChangingLanguage]);

  return (
    <div className="topbar">
      <div className="topbar__cluster">
        <TopButton label={t("nav.lizzardkevin")} onClick={() => onOpenTab("lizzardkevin")} />
        <TopButton label={t("nav.space")} onClick={onCloseTab} spaceWordOrigin />
        <TopButton label={t("nav.devStories")} onClick={() => onOpenTab("devStories")} />
      </div>

      <button
        type="button"
        aria-busy={isChangingLanguage}
        aria-label="Switch language"
        disabled={isChangingLanguage}
        onClick={toggleLanguage}
        className={`topbar__button topbar__button--language${isChangingLanguage ? " topbar__button--languageBusy" : ""}`}
      >
        {activeLanguage === "zh" ? "中" : "EN"}
      </button>
    </div>
  );
}
