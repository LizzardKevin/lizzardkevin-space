import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Howl } from "howler";
import { useAudioDirector } from "../audio/useAudioDirector";
import type { PlaybackState } from "./PlaybackState";
import { PlaybackContext, type PlaybackApi } from "./PlaybackContextValue";

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlaybackState | null>(null);
  const howlRef = useRef<Howl | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audio = useAudioDirector();

  const stopAudio = useCallback(() => {
    howlRef.current?.stop();
    howlRef.current?.unload();
    howlRef.current = null;
  }, []);

  const stopVideo = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.removeAttribute("src");
    v.load();
  }, []);

  const attachVideoElement = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
  }, []);

  const api = useMemo<PlaybackApi>(() => {
    const ensureHowl = (url: string) => {
      if (howlRef.current && (howlRef.current as unknown as { _src?: string })._src === url) {
        return howlRef.current;
      }
      stopVideo();
      howlRef.current?.unload();
      howlRef.current = new Howl({
        src: [url],
        html5: true,
        volume: 0.9,
        onend: () => {
          setState((s) => (s ? { ...s, playing: false, currentTime: s.duration } : s));
        },
      });
      return howlRef.current;
    };

    const getAudioTime = () => {
      const h = howlRef.current;
      if (!h) return 0;
      const v = h.seek();
      return typeof v === "number" ? v : 0;
    };

    const syncVideoState = (playing: boolean) => {
      const v = videoRef.current;
      if (!v) return;
      setState({
        kind: "video",
        url: v.currentSrc || v.src,
        playing,
        duration: Number.isFinite(v.duration) ? v.duration : 0,
        currentTime: v.currentTime,
      });
    };

    return {
      state,
      attachVideoElement,
      playAudio: (url) => {
        stopVideo();
        const h = ensureHowl(url);
        h.play();
        const d = h.duration() || 0;
        setState({ kind: "audio", url, playing: true, duration: d, currentTime: getAudioTime() });
      },
      playVideo: (url) => {
        stopAudio();
        const v = videoRef.current;
        if (!v) return;
        const current = v.getAttribute("src") ?? "";
        if (current !== url) v.src = url;
        void v.play().then(() => syncVideoState(true));
        v.onended = () => syncVideoState(false);
      },
      pause: () => {
        setState((s) => {
          if (!s) return s;
          if (s.kind === "video") {
            videoRef.current?.pause();
            return { ...s, playing: false, currentTime: videoRef.current?.currentTime ?? s.currentTime };
          }
          howlRef.current?.pause();
          return { ...s, playing: false, currentTime: getAudioTime() };
        });
      },
      stop: () => {
        stopAudio();
        stopVideo();
        setState(null);
      },
      toggle: () => {
        setState((s) => {
          if (!s) return s;
          if (s.kind === "video") {
            const v = videoRef.current;
            if (!v) return s;
            if (s.playing) v.pause();
            else void v.play();
            return { ...s, playing: !s.playing, currentTime: v.currentTime, duration: v.duration || s.duration };
          }
          const h = ensureHowl(s.url);
          if (s.playing) h.pause();
          else h.play();
          return { ...s, playing: !s.playing, currentTime: getAudioTime(), duration: h.duration() || s.duration };
        });
      },
      seekTo: (seconds) => {
        setState((s) => {
          if (!s) return s;
          if (s.kind === "video") {
            const v = videoRef.current;
            if (!v) return s;
            v.currentTime = Math.max(0, seconds);
            return { ...s, currentTime: v.currentTime, duration: v.duration || s.duration };
          }
          const h = howlRef.current;
          if (!h) return s;
          h.seek(Math.max(0, seconds));
          return { ...s, currentTime: getAudioTime(), duration: h.duration() || s.duration };
        });
      },
      seekBy: (seconds) => {
        setState((s) => {
          if (!s) return s;
          if (s.kind === "video") {
            const v = videoRef.current;
            if (!v) return s;
            v.currentTime = Math.max(0, v.currentTime + seconds);
            return { ...s, currentTime: v.currentTime, duration: v.duration || s.duration };
          }
          const h = howlRef.current;
          if (!h) return s;
          const t = getAudioTime();
          h.seek(Math.max(0, t + seconds));
          return { ...s, currentTime: getAudioTime(), duration: h.duration() || s.duration };
        });
      },
    };
  }, [state, attachVideoElement, stopAudio, stopVideo]);

  useEffect(() => {
    audio.duckBgm(!!state?.playing);
  }, [audio, state?.playing]);

  useEffect(() => {
    if (!state?.playing) return;
    const id = window.setInterval(() => {
      if (state.kind === "audio") {
        const h = howlRef.current;
        if (!h) return;
        const v = h.seek();
        const now = typeof v === "number" ? v : 0;
        const d = h.duration() || 0;
        setState((s) => (s ? { ...s, currentTime: now, duration: d } : s));
        return;
      }
      const v = videoRef.current;
      if (!v) return;
      setState((s) =>
        s
          ? {
              ...s,
              currentTime: v.currentTime,
              duration: Number.isFinite(v.duration) ? v.duration : s.duration,
            }
          : s,
      );
    }, 200);
    return () => window.clearInterval(id);
  }, [state?.playing, state?.kind]);

  return <PlaybackContext.Provider value={api}>{children}</PlaybackContext.Provider>;
}
