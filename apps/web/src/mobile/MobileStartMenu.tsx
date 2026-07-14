import { useRef, type PointerEvent } from "react";
import "./mobileStartMenu.css";

type MobileStartMenuProps = {
  onEnter: () => void;
};

function clampToUnit(value: number) {
  return Math.min(1, Math.max(-1, value));
}

export function MobileStartMenu({ onEnter }: MobileStartMenuProps) {
  const surfaceRef = useRef<HTMLElement | null>(null);

  const setPointerFeedback = (x: number, y: number) => {
    const surface = surfaceRef.current;
    if (!surface) return;
    surface.style.setProperty("--mobile-start-pointer-x", x.toFixed(3));
    surface.style.setProperty("--mobile-start-pointer-y", y.toFixed(3));
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const bounds = surface.getBoundingClientRect();
    const x = clampToUnit(((event.clientX - bounds.left) / bounds.width) * 2 - 1);
    const y = clampToUnit(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
    setPointerFeedback(x, y);
  };

  const resetPointerFeedback = () => {
    setPointerFeedback(0, 0);
  };

  return (
    <section
      ref={surfaceRef}
      className="mobile-start-menu"
      aria-labelledby="mobile-start-menu-title"
      onPointerDown={handlePointerMove}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointerFeedback}
      onPointerUp={resetPointerFeedback}
      onPointerCancel={resetPointerFeedback}
    >
      <h1 id="mobile-start-menu-title" className="mobile-start-menu__title">
        <span>LizzardKevin's</span>
        <strong>SPACE</strong>
      </h1>
      <button type="button" className="mobile-start-menu__enter" onClick={onEnter}>
        Enter
      </button>
    </section>
  );
}
