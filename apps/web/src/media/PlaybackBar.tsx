import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayback } from "./usePlayback";
import { PLAYBACK_BAR_REVEAL_MS } from "./playbackBarTiming";
import type { PlaybackState } from "./PlaybackState";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PlaybackBar({ elevated = false }: { elevated?: boolean }) {
  const { state, seekTo } = usePlayback();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const displayRef = useRef<PlaybackState | null>(null);

  if (state) displayRef.current = state;

  const displayState = state ?? displayRef.current;

  useEffect(() => {
    if (state) {
      setMounted(true);
      setVisible(false);
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    setVisible(false);
    const t = window.setTimeout(() => {
      setMounted(false);
      displayRef.current = null;
    }, PLAYBACK_BAR_REVEAL_MS);
    return () => window.clearTimeout(t);
  }, [state]);

  const pct = useMemo(() => {
    if (!displayState || displayState.duration <= 0) return 0;
    return Math.max(0, Math.min(1, displayState.currentTime / displayState.duration));
  }, [displayState]);

  if (!mounted || !displayState) return null;

  const visibilityClass = visible ? "playback-bar--in" : "playback-bar--out";

  return (
    <div
      className={`playback-bar ${visibilityClass}${elevated ? " playback-bar--focus-center" : ""}`}
      style={{ transitionDuration: `${PLAYBACK_BAR_REVEAL_MS}ms` }}
    >
      <div className="playback-bar__times">
        <span>{formatTime(displayState.currentTime)}</span>
        <span>{formatTime(displayState.duration)}</span>
      </div>
      <div
        className="playback-bar__track"
        onMouseDown={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
          const t = (x / rect.width) * (displayState.duration || 0);
          seekTo(t);
        }}
      >
        <div className="playback-bar__fill" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
