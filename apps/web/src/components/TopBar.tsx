import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { OverlayTab } from "../overlay/OverlayState";
import {
  SPACE_QUALITY_PRESET_ORDER,
  useSpaceVisualSettings,
  type SpaceQualityPreset,
} from "../space/spaceVisualSettings";

type SupportedLanguage = "zh" | "en";

const TOPBAR_SETTINGS_COPY = {
  en: {
    language: "Language",
    quality: "Quality",
    settingsLabel: "SPACE settings",
    qualityOptions: {
      performance: "Performance",
      balanced: "Balanced",
      cinematic: "Cinematic",
    } satisfies Record<SpaceQualityPreset, string>,
  },
  zh: {
    language: "语言",
    quality: "画质",
    settingsLabel: "SPACE 设置",
    qualityOptions: {
      performance: "性能",
      balanced: "平衡",
      cinematic: "电影",
    } satisfies Record<SpaceQualityPreset, string>,
  },
};

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
        localStorage.setItem("lang", next);
        document.documentElement.lang = next;
        setActiveLanguage(next);
      } finally {
        setIsChangingLanguage(false);
      }
    },
    [activeLanguage, i18n, isChangingLanguage],
  );

  const copy = TOPBAR_SETTINGS_COPY[activeLanguage];

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
        aria-label={copy.settingsLabel}
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
        <div className="topbar__settingsPanel" role="dialog" aria-label={copy.settingsLabel}>
          <div className="topbar__settingsRow">
            <span>{copy.language}</span>
            <div className="topbar__settingsSegment" role="group" aria-label={copy.language}>
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

          <div className="topbar__settingsRow topbar__settingsRow--quality">
            <span>{copy.quality}</span>
            <div className="topbar__settingsSegment" role="group" aria-label={copy.quality}>
              {SPACE_QUALITY_PRESET_ORDER.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={settings.qualityPreset === preset}
                  onClick={() => setQualityPreset(preset)}
                >
                  {copy.qualityOptions[preset]}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
