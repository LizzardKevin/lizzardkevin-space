import { Suspense, lazy, useCallback, useRef, useState } from "react";
import { useAudioDirector } from "../audio/useAudioDirector";
import { EntrySplash } from "../components/entry/EntrySplash";
import { useEntryTransition } from "../hooks/useEntryTransition";
import { useClientPlatform } from "../platform/useClientPlatform";
import { resumeSpaceFirstPerson } from "../space/requestSpacePointerLock";
import { MobileExperience } from "./MobileExperience";

const SpaceDesktopExperience = lazy(() =>
  import("./SpaceDesktopExperience").then((module) => ({
    default: module.SpaceDesktopExperience,
  })),
);

export function SpacePage({ overlay }: { overlay: { isOverlayOpen: boolean } }) {
  const platform = useClientPlatform();
  const entry = useEntryTransition();
  const audio = useAudioDirector();
  const { startFade } = entry;
  const [canvasReady, setCanvasReady] = useState(false);
  const [loadExhibits, setLoadExhibits] = useState(false);
  const entryWaitingForExhibitsRef = useRef(false);

  const isDesktop = platform === "desktop";
  const showSplash = entry.showSplash && (isDesktop ? canvasReady : true);

  const handleCanvasReady = useCallback(() => {
    setCanvasReady(true);
  }, []);

  const handleSceneExhibitsReady = useCallback(() => {
    if (!entryWaitingForExhibitsRef.current) return;
    entryWaitingForExhibitsRef.current = false;
    startFade();
  }, [startFade]);

  const handleEnter = useCallback(() => {
    if (isDesktop && !canvasReady) return;
    entry.freezeButtonFloat();
    entry.beginLoading();
    audio.unlock();
    if (isDesktop) {
      entryWaitingForExhibitsRef.current = true;
      setLoadExhibits(true);
      resumeSpaceFirstPerson();
      void audio.setZone("architecture");
    } else {
      entry.startFade();
    }
  }, [audio, canvasReady, entry, isDesktop]);

  return (
    <div style={{ height: "100vh", width: "100vw", background: "#ffffff" }}>
      {showSplash && <EntrySplash entry={entry} onEnter={handleEnter} />}
      {isDesktop && (
        <Suspense fallback={null}>
          <SpaceDesktopExperience
            entry={entry}
            overlay={overlay}
            loadExhibits={loadExhibits}
            onSceneExhibitsReady={handleSceneExhibitsReady}
            onCanvasReady={handleCanvasReady}
          />
        </Suspense>
      )}
      {!isDesktop && <MobileExperience entry={entry} />}
    </div>
  );
}
