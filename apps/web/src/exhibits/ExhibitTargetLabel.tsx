import { Html } from "@react-three/drei";
import { useEffect, useState } from "react";
import { EXHIBIT_TARGET } from "../scenes/gallery/galleryConfig";
import { formatExhibitLabel, type ExhibitTarget } from "./exhibitTarget";

const LABEL_FADE_MS = 200;

export function ExhibitTargetLabel({ target }: { target: ExhibitTarget | null }) {
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

  const anchor = target?.labelAnchor ?? display.labelAnchor;
  const { fontSizePx, distanceFactor } = EXHIBIT_TARGET.labelHtml;

  return (
    <Html
      position={anchor}
      transform
      sprite
      center
      distanceFactor={distanceFactor}
      zIndexRange={[40, 0]}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div
        className={`exhibit-target-label exhibit-target-label--float${visible ? " exhibit-target-label--visible" : ""}`}
        style={{ fontSize: `${fontSizePx}px` }}
      >
        {formatExhibitLabel(display.exhibitId)}
      </div>
    </Html>
  );
}
