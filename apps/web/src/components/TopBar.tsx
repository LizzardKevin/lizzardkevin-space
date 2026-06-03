import { useTranslation } from "react-i18next";
import type { OverlayTab } from "../overlay/OverlayState";

const linkStyle: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.82)",
  textDecoration: "none",
  padding: "8px 10px",
  textShadow: "0 1px 2px rgba(0, 0, 0, 0.22), 0 0 10px rgba(0, 0, 0, 0.12)",
};

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
      style={{
        ...linkStyle,
        background: "transparent",
        border: "none",
        cursor: "pointer",
      }}
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
    <div
      style={{
        position: "fixed",
        top: 8,
        left: 0,
        right: 0,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background: "transparent",
        zIndex: 10,
        userSelect: "none",
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", gap: 10, pointerEvents: "auto" }}>
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
        style={{
          marginLeft: 18,
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.6)",
          textShadow: "0 1px 2px rgba(0, 0, 0, 0.22), 0 0 10px rgba(0, 0, 0, 0.12)",
          background: "transparent",
          border: "none",
          padding: "8px 10px",
          cursor: "pointer",
          pointerEvents: "auto",
        }}
      >
        {i18n.language.toLowerCase().startsWith("zh") ? "EN" : "中"}
      </button>
    </div>
  );
}

