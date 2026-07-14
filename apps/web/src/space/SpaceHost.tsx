import { Suspense, useEffect } from "react";
import type { EntryTransition } from "../entry/entryTypes";
import type { SpaceBootController } from "../boot/useSpaceBootController";
import { SpaceDesktopExperience } from "../pages/SpaceDesktopExperience";
import { SpaceRouteCoordinator } from "./SpaceRouteCoordinator";

export default function SpaceHost({
  boot,
  entry,
  focusedExhibitId,
  onNavigateToSpace,
  onNavigateToWork,
  pauseMainAudio,
  routeBlocked,
}: {
  boot: SpaceBootController;
  entry: EntryTransition;
  focusedExhibitId: string | null;
  onNavigateToSpace: (options?: { fromEscape?: boolean }) => void;
  onNavigateToWork: (exhibitId: string) => void;
  pauseMainAudio: boolean;
  routeBlocked: boolean;
}) {
  const bootPhase = boot.state.phase;
  const startFade = entry.startFade;
  useEffect(() => {
    if (bootPhase === "running") startFade();
  }, [bootPhase, startFade]);

  return (
    <>
      <SpaceRouteCoordinator pauseMainAudio={pauseMainAudio} routeBlocked={routeBlocked} />
      <Suspense fallback={null}>
        <SpaceDesktopExperience
          boot={boot}
          entry={entry}
          focusedExhibitId={focusedExhibitId}
          loadExhibits
          onNavigateToSpace={onNavigateToSpace}
          onNavigateToWork={onNavigateToWork}
          overlay={{ isOverlayOpen: routeBlocked }}
          routeBlocked={routeBlocked}
        />
      </Suspense>
    </>
  );
}
