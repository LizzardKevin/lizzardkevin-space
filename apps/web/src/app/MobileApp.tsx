import { useCallback } from "react";
import { useAudioDirector } from "../audio/useAudioDirector";
import { EntrySplash } from "../components/entry/EntrySplash";
import { useEntryTransition } from "../hooks/useEntryTransition";
import { MobileExperience } from "../pages/MobileExperience";

export default function MobileApp() {
  const entry = useEntryTransition();
  const audio = useAudioDirector();

  const handleEnter = useCallback(() => {
    entry.freezeButtonFloat();
    entry.beginLoading();
    audio.unlock();
    entry.startFade();
  }, [audio, entry]);

  return (
    <div style={{ height: "100vh", width: "100vw", background: "#ffffff" }}>
      {entry.showSplash && <EntrySplash entry={entry} onEnter={handleEnter} />}
      <MobileExperience entry={entry} />
    </div>
  );
}
