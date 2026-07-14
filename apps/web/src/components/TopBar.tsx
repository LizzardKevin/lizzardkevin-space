import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { OverlayTab } from "../overlay/OverlayState";
import { useSpaceVisualSettings } from "../space/spaceVisualSettings";

type SupportedLanguage = "zh" | "en";

function normalizeLanguage(language: string | undefined): SupportedLanguage {
  return language?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function writeStoredLanguage(language: SupportedLanguage) {
  try {
    localStorage.setItem("lang", language);
  } catch {
    // Language persistence should never block the visible language switch.
  }
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
    <button type="button" onClick={onClick} className="topbar__button">
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
  const { settings, setQualityPreset } = useSpaceVisualSettings();
  const [activeLanguage, setActiveLanguage] = useState<SupportedLanguage>(() =>
    normalizeLanguage(i18n.resolvedLanguage ?? i18n.language),
  );
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const changeLanguage = useCallback(
    async (next: SupportedLanguage) => {
      if (isChangingLanguage || next === activeLanguage) return;
      setIsChangingLanguage(true);
      try {
        await i18n.changeLanguage(next);
        writeStoredLanguage(next);
        document.documentElement.lang = next;
        setActiveLanguage(next);
      } finally {
        setIsChangingLanguage(false);
      }
    },
    [activeLanguage, i18n, isChangingLanguage],
  );

  const settingsLabel = t("settings.label");
  const languageLabel = t("settings.language");
  const qualityLabel = t("settings.quality");
  const fullLabel = t("settings.qualityFull");
  const simplifiedLabel = t("settings.qualitySimplified");

  return (
    <div className="topbar">
      <div className="topbar__cluster">
        <TopButton label={t("nav.lizzardkevin")} onClick={() => onOpenTab("lizzardkevin")} />
        <TopButton label={t("nav.space")} onClick={onCloseTab} spaceWordOrigin />
        <TopButton label={t("nav.devStories")} onClick={() => onOpenTab("devStories")} />
      </div>

      <button
        type="button"
        aria-expanded={settingsOpen}
        aria-label={settingsLabel}
        onClick={() => setSettingsOpen((open) => !open)}
        className="topbar__settingsButton"
      >
        <span className="topbar__settingsIcon" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>

      {settingsOpen ? (
        <div className="topbar__settingsPanel" role="dialog" aria-label={settingsLabel}>
          <div className="topbar__settingsRow">
            <span>{languageLabel}</span>
            <div className="topbar__settingsSegment" role="group" aria-label={languageLabel}>
              <button
                type="button"
                aria-pressed={activeLanguage === "en"}
                disabled={isChangingLanguage}
                onClick={() => void changeLanguage("en")}
              >
                EN
              </button>
              <button
                type="button"
                aria-pressed={activeLanguage === "zh"}
                disabled={isChangingLanguage}
                onClick={() => void changeLanguage("zh")}
              >
                中
              </button>
            </div>
          </div>

          <div className="topbar__settingsRow">
            <span>{qualityLabel}</span>
            <div className="topbar__settingsSegment" role="group" aria-label={qualityLabel}>
              <button
                type="button"
                aria-pressed={settings.qualityPreset === "full"}
                onClick={() => setQualityPreset("full")}
              >
                {fullLabel}
              </button>
              <button
                type="button"
                aria-pressed={settings.qualityPreset === "simplified"}
                onClick={() => setQualityPreset("simplified")}
              >
                {simplifiedLabel}
              </button>
            </div>
          </div>

        </div>
      ) : null}
    </div>
  );
}
