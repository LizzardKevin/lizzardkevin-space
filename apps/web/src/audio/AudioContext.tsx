import { useMemo, useState } from "react";
import { AudioDirector } from "./AudioDirector";
import { AUDIO_PATHS, DEFAULT_VOLUMES } from "./audioConfig";
import { AudioDirectorContext } from "./AudioDirectorContext";

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const director = useMemo(
    () =>
      new AudioDirector({
        zoneBgmUrls: AUDIO_PATHS.zoneBgmUrls,
        zoneAmbientUrls: AUDIO_PATHS.zoneAmbientUrls,
        footstepUrls: [...AUDIO_PATHS.footstepUrls],
        jumpStartUrl: AUDIO_PATHS.jumpStartUrl,
        jumpLandUrl: AUDIO_PATHS.jumpLandUrl,
        defaultVolumes: { ...DEFAULT_VOLUMES },
      }),
    [],
  );

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
