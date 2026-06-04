import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlayback } from "./usePlayback";
import { PLAYBACK_BAR_REVEAL_MS } from "./playbackBarTiming";
import type { PlaybackState } from "./PlaybackState";

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function seekFraction(duration: number, clientX: number, rect: DOMRect) {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
  return (x / rect.width) * duration;
}

export function PlaybackBar({ elevated = false }: { elevated?: boolean }) {
  const { state, seekTo } = usePlayback();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const displayRef = useRef<PlaybackState | null>(null);
  const draggingRef = useRef(false);
  const trackRef = useRef<HTMLDivElement | null>(null);

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

  const liveDuration = state?.duration ?? displayState?.duration ?? 0;

  const pct = useMemo(() => {
    if (!displayState || liveDuration <= 0) return 0;
    return Math.max(0, Math.min(1, displayState.currentTime / liveDuration));
  }, [displayState, liveDuration]);

  const seekAtClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || liveDuration <= 0) return;
      const rect = track.getBoundingClientRect();
      seekTo(seekFraction(liveDuration, clientX, rect));
    },
    [liveDuration, seekTo],
  );

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      seekAtClientX(e.clientX);
    };
    const onPointerUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [seekAtClientX]);

  if (!mounted || !displayState) return null;

  const visibilityClass = visible ? "playback-bar--in" : "playback-bar--out";

  return (
    <div
      className={`playback-bar ${visibilityClass}${elevated ? " playback-bar--focus-center" : ""}`}
      style={{ transitionDuration: `${PLAYBACK_BAR_REVEAL_MS}ms` }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="playback-bar__times">
        <span>{formatTime(displayState.currentTime)}</span>
        <span>{formatTime(liveDuration)}</span>
      </div>
      <div
        ref={trackRef}
        className="playback-bar__track"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={liveDuration}
        aria-valuenow={displayState.currentTime}
        aria-label="播放进度"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          draggingRef.current = true;
          if (e.currentTarget.setPointerCapture) {
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          seekAtClientX(e.clientX);
        }}
      >
        <div className="playback-bar__fill" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
