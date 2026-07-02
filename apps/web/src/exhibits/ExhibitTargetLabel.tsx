import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useTranslation } from "react-i18next";
import { EXHIBIT_TARGET } from "../scenes/gallery/galleryConfig";
import { formatExhibitLabel, type ExhibitTarget } from "./exhibitTarget";
import { resolveExhibitLabelUiPosition } from "./exhibitTargetLabelLayout";
import { normalizeSupportedLanguage } from "../i18n/resolveInitialLanguage";

export function ExhibitTargetLabel({ target }: { target: ExhibitTarget | null }) {
  const { i18n } = useTranslation();
  const language = normalizeSupportedLanguage(i18n.resolvedLanguage ?? i18n.language);
  const size = useThree((state) => state.size);
  if (!target) return null;

  const { cursorOffsetYPx, fontSizePx } = EXHIBIT_TARGET.labelHtml;
  const labelPosition = resolveExhibitLabelUiPosition(size, cursorOffsetYPx);

  return (
    <Html
      fullscreen
      zIndexRange={[40, 0]}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div
        style={{
          position: "absolute",
          left: `${labelPosition.x}px`,
          top: `${labelPosition.y}px`,
          transform: "translateX(-50%)",
        }}
      >
        <div
          className="exhibit-target-label exhibit-target-label--visible"
          style={{ fontSize: `${fontSizePx}px` }}
        >
          {formatExhibitLabel(target.exhibitId, language)}
        </div>
      </div>
    </Html>
  );
}
