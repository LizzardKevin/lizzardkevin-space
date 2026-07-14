import { Suspense, useCallback, useRef } from "react";
import type { EntryTransition } from "../entry/entryTypes";
import { SpaceDesktopExperience } from "../pages/SpaceDesktopExperience";
import { SpaceRouteCoordinator } from "./SpaceRouteCoordinator";

export default function SpaceHost({
  entry,
  focusedExhibitId,
  onNavigateToSpace,
  onNavigateToWork,
  pauseMainAudio,
  routeBlocked,
}: {
  entry: EntryTransition;
  focusedExhibitId: string | null;
  onNavigateToSpace: (options?: { fromEscape?: boolean }) => void;
  onNavigateToWork: (exhibitId: string) => void;
  pauseMainAudio: boolean;
  routeBlocked: boolean;
}) {
  const entryWaitingForExhibitsRef = useRef(true);
  const handleSceneExhibitsReady = useCallback(() => {
    if (!entryWaitingForExhibitsRef.current) return;
    entryWaitingForExhibitsRef.current = false;
    entry.startFade();
  }, [entry]);

  return (
    <>
      <SpaceRouteCoordinator pauseMainAudio={pauseMainAudio} routeBlocked={routeBlocked} />
      <Suspense fallback={null}>
        <SpaceDesktopExperience
          entry={entry}
          focusedExhibitId={focusedExhibitId}
          loadExhibits
          onNavigateToSpace={onNavigateToSpace}
          onNavigateToWork={onNavigateToWork}
          onSceneExhibitsReady={handleSceneExhibitsReady}
          overlay={{ isOverlayOpen: routeBlocked }}
          routeBlocked={routeBlocked}
        />
      </Suspense>
    </>
  );
}
