import { useContext } from "react";
import { PlaybackContext } from "./PlaybackContextValue";

export function usePlayback() {
  const v = useContext(PlaybackContext);
  if (!v) throw new Error("usePlayback must be used within PlaybackProvider");
  return v;
}

