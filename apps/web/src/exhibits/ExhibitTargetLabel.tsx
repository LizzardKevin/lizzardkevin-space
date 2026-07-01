import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { EXHIBIT_TARGET } from "../scenes/gallery/galleryConfig";
import { formatExhibitLabel, type ExhibitTarget } from "./exhibitTarget";
import { resolveExhibitLabelUiPosition } from "./exhibitTargetLabelLayout";

const LABEL_FADE_MS = 200;

export function ExhibitTargetLabel({ target }: { target: ExhibitTarget | null }) {
  const size = useThree((state) => state.size);
  const [display, setDisplay] = useState<ExhibitTarget | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (target) {
      let showRaf = 0;
      const displayRaf = requestAnimationFrame(() => {
        setDisplay(target);
        showRaf = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(displayRaf);
        cancelAnimationFrame(showRaf);
      };
    }

    const hideRaf = requestAnimationFrame(() => setVisible(false));
    const timer = window.setTimeout(() => setDisplay(null), LABEL_FADE_MS);
    return () => {
      cancelAnimationFrame(hideRaf);
      window.clearTimeout(timer);
    };
  }, [target]);

  if (!display) return null;

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
          transform: "translate(-50%, -50%)",
        }}
      >
        <div
          className={`exhibit-target-label exhibit-target-label--float${visible ? " exhibit-target-label--visible" : ""}`}
          style={{ fontSize: `${fontSizePx}px` }}
        >
          {formatExhibitLabel(display.exhibitId)}
        </div>
      </div>
    </Html>
  );
}
