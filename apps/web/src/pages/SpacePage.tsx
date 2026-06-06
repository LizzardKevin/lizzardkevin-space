import { useCallback, useEffect, useState } from "react";
import { useAudioDirector } from "../audio/useAudioDirector";
import { EntrySplash } from "../components/entry/EntrySplash";
import { useEntryTransition } from "../hooks/useEntryTransition";
import { useClientPlatform } from "../platform/useClientPlatform";
import { isWebGPUSupported } from "../rendering/webgpuSupport";
import { resumeSpaceFirstPerson } from "../space/requestSpacePointerLock";
import { SpaceDesktopExperience } from "./SpaceDesktopExperience";
import { MobileExperience } from "./MobileExperience";

export function SpacePage({ overlay }: { overlay: { isOverlayOpen: boolean } }) {
  const platform = useClientPlatform();
  const entry = useEntryTransition();
  const audio = useAudioDirector();
  const [webgpuReady, setWebgpuReady] = useState<boolean | null>(null);

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
  const showSplash = entry.showSplash && (isDesktop ? canRender3d : true);

  const handleEnter = useCallback(() => {
    entry.freezeButtonFloat();
    audio.unlock();
    if (isDesktop) {
      resumeSpaceFirstPerson();
      void audio.setZone("architecture");
    }
    entry.startFade();
  }, [audio, entry, isDesktop]);

  return (
    <div style={{ height: "100vh", width: "100vw", background: "#ffffff" }}>
      {showSplash && <EntrySplash entry={entry} onEnter={handleEnter} />}
      {isDesktop && <SpaceDesktopExperience entry={entry} overlay={overlay} />}
      {!isDesktop && <MobileExperience entry={entry} />}
    </div>
  );
}
