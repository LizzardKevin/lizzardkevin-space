import { useEffect, useRef, useState } from "react";

const MAX_BURSTS = 6;

export function Crosshair({ isHovering, pulseNonce }: { isHovering: boolean; pulseNonce?: number }) {
  const [bursts, setBursts] = useState<number[]>([]);
  const burstId = useRef(0);

  useEffect(() => {
    if (!pulseNonce || isHovering) return;
    const id = ++burstId.current;
    setBursts((prev) => [...prev, id].slice(-MAX_BURSTS));
  }, [pulseNonce, isHovering]);

  const removeBurst = (id: number) => {
    setBursts((prev) => prev.filter((b) => b !== id));
  };

  return (
    <div aria-hidden className={`crosshair${isHovering ? " crosshair--active" : ""}`}>
      {bursts.map((id) => (
        <span
          key={id}
          className="crosshair-burst"
          onAnimationEnd={() => removeBurst(id)}
        />
      ))}
    </div>
  );
}
