import { useMemo } from "react";
import { usePlayback } from "./usePlayback";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PlaybackBar() {
  const { state, seekTo } = usePlayback();

  const pct = useMemo(() => {
    if (!state || state.duration <= 0) return 0;
    return Math.max(0, Math.min(1, state.currentTime / state.duration));
  }, [state]);

  if (!state) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 18,
        transform: "translateX(-50%)",
        width: "min(680px, 86vw)",
        zIndex: 80,
        fontFamily: "system-ui",
        color: "rgba(255,255,255,0.75)",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, opacity: 0.8 }}>
        <span>{formatTime(state.currentTime)}</span>
        <span>{formatTime(state.duration)}</span>
      </div>
      <div
        onMouseDown={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
          const t = (x / rect.width) * (state.duration || 0);
          seekTo(t);
        }}
        style={{
          height: 10,
          marginTop: 6,
          borderRadius: 999,
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.12)",
          cursor: "pointer",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct * 100}%`,
            background: "rgba(255,255,255,0.7)",
          }}
        />
      </div>
    </div>
  );
}

