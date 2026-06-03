import { useEffect } from "react";

export function Toast({
  message,
  durationMs = 2000,
  onDone,
}: {
  message: string | null;
  durationMs?: number;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDone, durationMs);
    return () => window.clearTimeout(t);
  }, [durationMs, message, onDone]);

  if (!message) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        left: "50%",
        bottom: 74,
        transform: "translateX(-50%)",
        zIndex: 90,
        padding: "8px 12px",
        borderRadius: 999,
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.14)",
        backdropFilter: "blur(10px)",
        color: "rgba(255,255,255,0.9)",
        fontFamily: "inherit",
        fontSize: 12,
        letterSpacing: "0.04em",
        userSelect: "none",
        pointerEvents: "none",
        opacity: 1,
        transition: "opacity 160ms ease",
      }}
    >
      {message}
    </div>
  );
}

