import { useMemo } from "react";
import { usePlayback } from "./usePlayback";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PlaybackBar({ elevated = false }: { elevated?: boolean }) {
  const { state, seekTo } = usePlayback();

  const pct = useMemo(() => {
    if (!state || state.duration <= 0) return 0;
    return Math.max(0, Math.min(1, state.currentTime / state.duration));
  }, [state]);

  if (!state) return null;

  return (
    <div className={`playback-bar${elevated ? " playback-bar--focus-center" : ""}`}>
      <div className="playback-bar__times">
        <span>{formatTime(state.currentTime)}</span>
        <span>{formatTime(state.duration)}</span>
      </div>
      <div
        className="playback-bar__track"
        onMouseDown={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
          const t = (x / rect.width) * (state.duration || 0);
          seekTo(t);
        }}
      >
        <div className="playback-bar__fill" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
