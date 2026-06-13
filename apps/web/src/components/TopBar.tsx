import { useTranslation } from "react-i18next";
import type { OverlayTab } from "../overlay/OverlayState";

function TopButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="topbar__button"
    >
      {label}
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
  return (
    <div className="topbar">
      <div className="topbar__cluster">
        <TopButton label={t("nav.lizzardkevin")} onClick={() => onOpenTab("lizzardkevin")} />
        <TopButton label={t("nav.space")} onClick={onCloseTab} />
        <TopButton label={t("nav.devStories")} onClick={() => onOpenTab("devStories")} />
      </div>

      <button
        type="button"
        onClick={() => {
          // i18n.language 可能是 zh-CN / en-US，统一用前缀判断
          const isZh = i18n.language.toLowerCase().startsWith("zh");
          const next = isZh ? "en" : "zh";
          i18n.changeLanguage(next);
          localStorage.setItem("lang", next);
        }}
        className="topbar__button topbar__button--language"
      >
        {i18n.language.toLowerCase().startsWith("zh") ? "EN" : "中"}
      </button>
    </div>
  );
}
