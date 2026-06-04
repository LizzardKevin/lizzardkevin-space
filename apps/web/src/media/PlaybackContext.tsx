import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Howl } from "howler";
import { useAudioDirector } from "../audio/useAudioDirector";
import { PLAYBACK_BAR_REVEAL_MS } from "./playbackBarTiming";
import type { PlaybackState } from "./PlaybackState";
import { PlaybackContext, type PlaybackApi } from "./PlaybackContextValue";

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlaybackState | null>(null);
  const howlRef = useRef<Howl | null>(null);
  const howlUrlRef = useRef<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audio = useAudioDirector();
  /** 进度条已完成首次渐入，暂停/继续不再延迟。 */
  const barRevealedRef = useRef(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRevealTimer = useCallback(() => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const stopAudio = useCallback(() => {
    howlRef.current?.stop();
    howlRef.current?.unload();
    howlRef.current = null;
    howlUrlRef.current = null;
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

    const getAudioTime = () => {
      const h = howlRef.current;
      if (!h) return 0;
      const v = h.seek();
      return typeof v === "number" ? v : 0;
    };

    const patchAudioState = (
      url: string,
      patch: Partial<PlaybackState> & { playing?: boolean },
    ) => {
      setState((s) => {
        if (!s || s.kind !== "audio" || s.url !== url) return s;
        const h = howlRef.current;
        const duration = h && h.duration() > 0 ? h.duration() : s.duration;
        return {
          ...s,
          duration,
          currentTime: patch.currentTime ?? getAudioTime(),
          ...patch,
        };
      });
    };

    const ensureHowl = (url: string) => {
      if (howlRef.current && howlUrlRef.current === url) {
        howlRef.current.volume(exhibitVolume());
        return howlRef.current;
      }
      stopVideo();
      howlRef.current?.unload();
      howlUrlRef.current = url;
      howlRef.current = new Howl({
        src: [url],
        html5: true,
        volume: exhibitVolume(),
        onload: () => patchAudioState(url, {}),
        onloaderror: (_id, err) => {
          console.warn("[playback] exhibit audio failed to load:", url, err);
          clearRevealTimer();
          barRevealedRef.current = false;
          stopAudio();
          setState(null);
        },
        onend: () => {
          setState((s) =>
            s?.kind === "audio" && s.url === url
              ? { ...s, playing: false, currentTime: s.duration }
              : s,
          );
        },
      });
      return howlRef.current;
    };

    const playHowlWhenReady = (url: string) => {
      const h = ensureHowl(url);
      const begin = () => {
        h.play();
        const d = h.duration() || 0;
        setState({
          kind: "audio",
          url,
          playing: true,
          duration: d,
          currentTime: getAudioTime(),
        });
      };
      if (h.state() === "loaded") {
        begin();
        return;
      }
      h.once("load", begin);
      if (h.state() === "unloaded") h.load();
    };

    const preloadHowl = (url: string) => {
      const h = ensureHowl(url);
      if (h.state() === "unloaded") h.load();
    };

    /** 首次唤出进度条：先展示并等渐入结束，再播放。 */
    const playAudioWithBarReveal = (url: string) => {
      stopVideo();
      preloadHowl(url);
      setState({ kind: "audio", url, playing: false, duration: 0, currentTime: 0 });
      clearRevealTimer();
      revealTimerRef.current = window.setTimeout(() => {
        revealTimerRef.current = null;
        barRevealedRef.current = true;
        playHowlWhenReady(url);
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

    return {
      state,
      attachVideoElement,
      playAudio: (url) => {
        if (barRevealedRef.current) {
          playHowlWhenReady(url);
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
          howlRef.current?.pause();
          return { ...s, playing: false, currentTime: getAudioTime() };
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
          const h = ensureHowl(s.url);
          if (s.playing) h.pause();
          else {
            if (h.state() === "loaded") h.play();
            else {
              h.once("load", () => h.play());
              if (h.state() === "unloaded") h.load();
            }
          }
          return {
            ...s,
            playing: !s.playing,
            currentTime: getAudioTime(),
            duration: h.duration() || s.duration,
          };
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
        const h = howlRef.current;
        if (!h || howlUrlRef.current !== state.url) return;
        const v = h.seek();
        const now = typeof v === "number" ? v : 0;
        const d = h.duration() || 0;
        setState((s) =>
          s?.kind === "audio" && s.url === state.url
            ? { ...s, currentTime: now, duration: d > 0 ? d : s.duration }
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
