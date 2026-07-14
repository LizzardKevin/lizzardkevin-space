import { useEffect } from "react";
import { useAudioDirector } from "../audio/useAudioDirector";
import { usePlayback } from "../media/usePlayback";
import { releaseSpacePointerLock } from "./requestSpacePointerLock";

export function SpaceRouteCoordinator({ routeBlocked }: { routeBlocked: boolean }) {
  const audio = useAudioDirector();
  const playback = usePlayback();

  useEffect(() => {
    if (routeBlocked) {
      releaseSpacePointerLock();
      playback.pause();
    }
    audio.setRoutePaused(routeBlocked);
    return () => {
      audio.setRoutePaused(false);
    };
  }, [audio, playback, routeBlocked]);

  return null;
}
