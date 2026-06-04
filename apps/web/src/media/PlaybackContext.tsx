import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAudioDirector } from "../audio/useAudioDirector";
import { PLAYBACK_BAR_REVEAL_MS } from "./playbackBarTiming";
import type { PlaybackState } from "./PlaybackState";
import { PlaybackContext, type PlaybackApi } from "./PlaybackContextValue";

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlaybackState | null>(null);
  const exhibitAudioRef = useRef<HTMLAudioElement | null>(null);
  const exhibitUrlRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audio = useAudioDirector();
  const barRevealedRef = useRef(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRevealTimer = useCallback(() => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const stopAudio = useCallback(() => {
    const a = exhibitAudioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    exhibitAudioRef.current = null;
    exhibitUrlRef.current = null;
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
    const exhibitVolume = () => audio.channelVolume("exhibit");

    const getExhibitAudio = (url: string) => {
      if (exhibitAudioRef.current && exhibitUrlRef.current === url) {
        exhibitAudioRef.current.volume = exhibitVolume();
        return exhibitAudioRef.current;
      }
      stopAudio();
      const el = new Audio(url);
      el.preload = "auto";
      el.volume = exhibitVolume();
      exhibitUrlRef.current = url;
      exhibitAudioRef.current = el;

      el.addEventListener("loadedmetadata", () => {
        setState((s) =>
          s?.kind === "audio" && s.url === url
            ? { ...s, duration: Number.isFinite(el.duration) ? el.duration : s.duration }
            : s,
        );
      });
      el.addEventListener("ended", () => {
        setState((s) =>
          s?.kind === "audio" && s.url === url
            ? { ...s, playing: false, currentTime: Number.isFinite(el.duration) ? el.duration : s.currentTime }
            : s,
        );
      });

      return el;
    };

    const playExhibitAudioNow = (url: string) => {
      const el = getExhibitAudio(url);
      void el.play().then(() => {
        setState({
          kind: "audio",
          url,
          playing: true,
          duration: Number.isFinite(el.duration) ? el.duration : 0,
          currentTime: el.currentTime,
        });
      }).catch((err) => {
        console.warn("[playback] exhibit audio failed to play:", url, err);
        clearRevealTimer();
        barRevealedRef.current = false;
        stopAudio();
        setState(null);
      });
    };

    const preloadExhibitAudio = (url: string) => {
      const el = getExhibitAudio(url);
      el.load();
    };

    const playAudioWithBarReveal = (url: string) => {
      stopVideo();
      preloadExhibitAudio(url);
      setState({ kind: "audio", url, playing: false, duration: 0, currentTime: 0 });
      clearRevealTimer();
      revealTimerRef.current = window.setTimeout(() => {
        revealTimerRef.current = null;
        barRevealedRef.current = true;
        playExhibitAudioNow(url);
      }, PLAYBACK_BAR_REVEAL_MS);
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

    const playVideoNow = (url: string) => {
      const v = videoRef.current;
      if (!v) return;
      const current = v.getAttribute("src") ?? "";
      if (current !== url) v.src = url;
      const onMeta = () => syncVideoState(true);
      if (Number.isFinite(v.duration) && v.duration > 0) {
        void v.play().then(() => syncVideoState(true));
      } else {
        v.addEventListener("loadedmetadata", onMeta, { once: true });
        void v.play().then(() => {
          if (Number.isFinite(v.duration) && v.duration > 0) syncVideoState(true);
        });
      }
      v.onended = () => syncVideoState(false);
    };

    const exhibitDuration = (s: PlaybackState, el: HTMLAudioElement | null) => {
      if (Number.isFinite(el?.duration) && (el?.duration ?? 0) > 0) return el!.duration;
      return s.duration;
    };

    return {
      state,
      attachVideoElement,
      playAudio: (url) => {
        if (barRevealedRef.current) {
          stopVideo();
          playExhibitAudioNow(url);
          return;
        }
        playAudioWithBarReveal(url);
      },
      playVideo: (url) => {
        stopAudio();
        const v = videoRef.current;
        if (!v) return;
        if (barRevealedRef.current) {
          playVideoNow(url);
          return;
        }
        setState({
          kind: "video",
          url,
          playing: false,
          duration: 0,
          currentTime: 0,
        });
        clearRevealTimer();
        revealTimerRef.current = window.setTimeout(() => {
          revealTimerRef.current = null;
          barRevealedRef.current = true;
          playVideoNow(url);
        }, PLAYBACK_BAR_REVEAL_MS);
      },
      pause: () => {
        setState((s) => {
          if (!s) return s;
          if (s.kind === "video") {
            videoRef.current?.pause();
            return { ...s, playing: false, currentTime: videoRef.current?.currentTime ?? s.currentTime };
          }
          exhibitAudioRef.current?.pause();
          return {
            ...s,
            playing: false,
            currentTime: exhibitAudioRef.current?.currentTime ?? s.currentTime,
          };
        });
      },
      stop: () => {
        clearRevealTimer();
        barRevealedRef.current = false;
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
          const el = getExhibitAudio(s.url);
          if (s.playing) {
            el.pause();
            return { ...s, playing: false, currentTime: el.currentTime };
          }
          void el.play();
          return {
            ...s,
            playing: true,
            currentTime: el.currentTime,
            duration: exhibitDuration(s, el),
          };
        });
      },
      seekTo: (seconds) => {
        setState((s) => {
          if (!s) return s;
          if (s.kind === "video") {
            const v = videoRef.current;
            if (!v) return s;
            const duration = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : s.duration;
            const target = Math.max(0, Math.min(seconds, duration || seconds));
            v.currentTime = target;
            return { ...s, currentTime: v.currentTime, duration: duration || s.duration };
          }
          const el = exhibitAudioRef.current;
          if (!el || exhibitUrlRef.current !== s.url) return s;
          const duration = exhibitDuration(s, el);
          const target = Math.max(0, Math.min(seconds, duration > 0 ? duration : seconds));
          el.currentTime = target;
          if (s.playing) void el.play();
          return {
            ...s,
            currentTime: target,
            duration: duration || s.duration,
            playing: s.playing,
          };
        });
      },
      seekBy: (seconds) => {
        setState((s) => {
          if (!s) return s;
          if (s.kind === "video") {
            const v = videoRef.current;
            if (!v) return s;
            const duration = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : s.duration;
            const target = Math.max(0, Math.min(v.currentTime + seconds, duration || Infinity));
            v.currentTime = target;
            return { ...s, currentTime: v.currentTime, duration: duration || s.duration };
          }
          const el = exhibitAudioRef.current;
          if (!el || exhibitUrlRef.current !== s.url) return s;
          const duration = exhibitDuration(s, el);
          const target = Math.max(
            0,
            Math.min(el.currentTime + seconds, duration > 0 ? duration : el.currentTime + seconds),
          );
          el.currentTime = target;
          if (s.playing) void el.play();
          return {
            ...s,
            currentTime: target,
            duration: duration || s.duration,
            playing: s.playing,
          };
        });
      },
    };
  }, [state, attachVideoElement, stopAudio, stopVideo, audio, clearRevealTimer]);

  useEffect(() => {
    const duck = !!state?.playing;
    audio.duckBgm(duck);
    audio.duckAmbient(duck);
  }, [audio, state?.playing]);

  useEffect(() => {
    if (!state) return;
    const id = window.setInterval(() => {
      if (state.kind === "audio") {
        const el = exhibitAudioRef.current;
        if (!el || exhibitUrlRef.current !== state.url) return;
        setState((s) =>
          s?.kind === "audio" && s.url === state.url
            ? {
                ...s,
                currentTime: el.currentTime,
                duration:
                  Number.isFinite(el.duration) && el.duration > 0 ? el.duration : s.duration,
              }
            : s,
        );
        return;
      }
      if (!state.playing) return;
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
  }, [state]);

  useEffect(() => () => clearRevealTimer(), [clearRevealTimer]);

  return <PlaybackContext.Provider value={api}>{children}</PlaybackContext.Provider>;
}
