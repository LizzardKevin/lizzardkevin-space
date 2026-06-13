import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { useAudioDirector } from "../audio/useAudioDirector";
import { EntrySplash } from "../components/entry/EntrySplash";
import { useEntryTransition } from "../hooks/useEntryTransition";
import { useClientPlatform } from "../platform/useClientPlatform";
import { isWebGPUSupported } from "../rendering/webgpuSupport";
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
  const [webgpuReady, setWebgpuReady] = useState<boolean | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  const isDesktop = platform === "desktop";

  useEffect(() => {
    if (!isDesktop) return;
    let cancelled = false;
    isWebGPUSupported().then((ok) => {
      if (!cancelled) setWebgpuReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [isDesktop]);

  const canRender3d = isDesktop && webgpuReady === true;
  const canEnterDesktopSpace = canRender3d && canvasReady;
  const showSplash = entry.showSplash && (isDesktop ? canEnterDesktopSpace : true);

  const handleCanvasReady = useCallback(() => {
    setCanvasReady(true);
  }, []);

  const handleEnter = useCallback(() => {
    if (isDesktop && !canvasReady) return;
    entry.freezeButtonFloat();
    audio.unlock();
    if (isDesktop) {
      resumeSpaceFirstPerson();
      void audio.setZone("architecture");
    }
    entry.startFade();
  }, [audio, canvasReady, entry, isDesktop]);

  return (
    <div style={{ height: "100vh", width: "100vw", background: "#ffffff" }}>
      {showSplash && <EntrySplash entry={entry} onEnter={handleEnter} />}
      {isDesktop && (
        <Suspense fallback={null}>
          <SpaceDesktopExperience entry={entry} overlay={overlay} onCanvasReady={handleCanvasReady} />
        </Suspense>
      )}
      {!isDesktop && <MobileExperience entry={entry} />}
    </div>
  );
}
