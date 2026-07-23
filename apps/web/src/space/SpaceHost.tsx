import { Suspense } from "react";
import type { SpaceBootController } from "../boot/useSpaceBootController";
import { SpaceDesktopExperience } from "../pages/SpaceDesktopExperience";
import { SpaceRouteCoordinator } from "./SpaceRouteCoordinator";

export default function SpaceHost({
  boot,
  entered,
  onNavigateToWork,
  pauseMainAudio,
  routeBlocked,
}: {
  boot: SpaceBootController;
  entered: boolean;
  onNavigateToWork: (exhibitId: string) => void;
  pauseMainAudio: boolean;
  routeBlocked: boolean;
}) {
  return (
    <>
      <SpaceRouteCoordinator pauseMainAudio={pauseMainAudio} routeBlocked={routeBlocked} />
      <Suspense fallback={null}>
        <SpaceDesktopExperience
          boot={boot}
          entered={entered}
          loadExhibits
          onNavigateToWork={onNavigateToWork}
          overlay={{ isOverlayOpen: routeBlocked }}
          routeBlocked={routeBlocked}
        />
      </Suspense>
    </>
  );
}
