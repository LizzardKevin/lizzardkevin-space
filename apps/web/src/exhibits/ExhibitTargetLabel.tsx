import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { EXHIBIT_TARGET } from "../scenes/gallery/galleryConfig";
import { formatExhibitLabel, type ExhibitTarget } from "./exhibitTarget";
import {
  clampExhibitLabelScreenPoint,
  type ExhibitLabelScreenPoint,
} from "./exhibitTargetLabelLayout";

const LABEL_FADE_MS = 200;

export function ExhibitTargetLabel({ target }: { target: ExhibitTarget | null }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const [display, setDisplay] = useState<ExhibitTarget | null>(null);
  const [visible, setVisible] = useState(false);
  const [screenPoint, setScreenPoint] = useState<ExhibitLabelScreenPoint | null>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const projectedAnchor = useMemo(() => new THREE.Vector3(), []);

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

  useFrame(() => {
    if (!display) return;
    const anchor = target?.labelAnchor ?? display.labelAnchor;
    projectedAnchor.copy(anchor).project(camera);
    const next = clampExhibitLabelScreenPoint(
      {
        x: Math.round((projectedAnchor.x * 0.5 + 0.5) * size.width),
        y: Math.round((-projectedAnchor.y * 0.5 + 0.5) * size.height),
      },
      size,
      EXHIBIT_TARGET.labelScreenPaddingPx,
      {
        width: labelRef.current?.offsetWidth ?? 0,
        height: labelRef.current?.offsetHeight ?? 0,
      },
    );

    setScreenPoint((current) => (current?.x === next.x && current.y === next.y ? current : next));
  });

  if (!display) return null;

  const { fontSizePx } = EXHIBIT_TARGET.labelHtml;
  const labelPosition = screenPoint ?? { x: size.width / 2, y: size.height / 2 };

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
          ref={labelRef}
          className={`exhibit-target-label exhibit-target-label--float${visible ? " exhibit-target-label--visible" : ""}`}
          style={{ fontSize: `${fontSizePx}px` }}
        >
          {formatExhibitLabel(display.exhibitId)}
        </div>
      </div>
    </Html>
  );
}
