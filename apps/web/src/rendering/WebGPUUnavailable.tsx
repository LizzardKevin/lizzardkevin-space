import { useTranslation } from "react-i18next";

export function WebGPUUnavailable() {
  const { t } = useTranslation();
  return (
    <div className="space-renderer-unavailable">
      <div className="space-renderer-unavailable__content">
        <div className="space-renderer-unavailable__title">
          {t("space.rendererUnavailableTitle")}
        </div>
        <p>
          {t("space.rendererUnavailableBody")}
        </p>
      </div>
    </div>
  );
}
