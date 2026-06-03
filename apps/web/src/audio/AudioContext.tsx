import { useMemo, useState } from "react";
import { AudioDirector } from "./AudioDirector";
import { AudioDirectorContext } from "./AudioDirectorContext";

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const director = useMemo(
    () =>
      new AudioDirector({
        // 占位：后续会由 CMS（zone.bgmUrl / zone.ambientLoopUrl）驱动
        zoneBgmUrls: {
          architecture: "/audio/bgm_architecture.mp3",
          ai: "/audio/bgm_ai.mp3",
          photography: "/audio/bgm_photography.mp3",
          anime: "/audio/bgm_anime.mp3",
          band: "/audio/bgm_band.mp3",
        },
        zoneAmbientUrls: {
          architecture: "/audio/ambient_architecture.mp3",
          ai: "/audio/ambient_ai.mp3",
          photography: "/audio/ambient_photography.mp3",
          anime: "/audio/ambient_anime.mp3",
          band: "/audio/ambient_band.mp3",
        },
      }),
    [],
  );

  // Trigger rerender on unlock/volume changes where we need it.
  const [, setTick] = useState(0);
  const api = useMemo(
    () => ({
      director,
      bump: () => setTick((x) => x + 1),
    }),
    [director],
  );

  return (
    <AudioDirectorContext.Provider value={api.director}>{children}</AudioDirectorContext.Provider>
  );
}

