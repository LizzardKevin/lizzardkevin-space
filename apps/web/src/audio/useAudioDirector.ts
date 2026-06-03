import { useContext } from "react";
import { AudioDirectorContext } from "./AudioDirectorContext";

export function useAudioDirector() {
  const v = useContext(AudioDirectorContext);
  if (!v) throw new Error("useAudioDirector must be used within AudioProvider");
  return v;
}

