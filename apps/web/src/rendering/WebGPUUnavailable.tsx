import { useTranslation } from "react-i18next";

export function WebGPUUnavailable() {
  const { i18n } = useTranslation();
  const isChinese = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith("zh");
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(10px)",
        fontFamily: "system-ui",
        color: "rgba(255,255,255,0.92)",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420, lineHeight: 1.6 }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: 0.65,
            marginBottom: 12,
          }}
        >
          {isChinese ? "渲染器不可用" : "Renderer unavailable"}
        </div>
        <p style={{ margin: 0, fontSize: 15 }}>
          {isChinese
            ? "无法初始化 WebGPU 或 WebGL2 渲染器。"
            : "Unable to initialize a WebGPU or WebGL2 renderer."}
        </p>
      </div>
    </div>
  );
}
