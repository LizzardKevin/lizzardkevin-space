import { useEffect } from "react";
import { useAudioDirector } from "../audio/useAudioDirector";
import { releaseSpacePointerLock } from "./requestSpacePointerLock";

export function SpaceRouteCoordinator({
  pauseMainAudio,
  routeBlocked,
}: {
  pauseMainAudio: boolean;
  routeBlocked: boolean;
}) {
  const audio = useAudioDirector();

  useEffect(() => {
    if (routeBlocked) {
      releaseSpacePointerLock();
    }
    audio.setRoutePaused(pauseMainAudio);
    return () => {
      audio.setRoutePaused(false);
    };
  }, [audio, pauseMainAudio, routeBlocked]);

  return null;
}
