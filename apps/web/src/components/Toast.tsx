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
      className="space-toast"
    >
      {message}
    </div>
  );
}
