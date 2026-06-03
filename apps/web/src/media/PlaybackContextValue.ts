import { createContext } from "react";
import type { PlaybackState } from "./PlaybackState";

export type PlaybackApi = {
  state: PlaybackState | null;
  playAudio: (url: string) => void;
  playVideo: (url: string) => void;
  attachVideoElement: (el: HTMLVideoElement | null) => void;
  pause: () => void;
  stop: () => void;
  toggle: () => void;
  seekTo: (seconds: number) => void;
  seekBy: (seconds: number) => void;
};

export const PlaybackContext = createContext<PlaybackApi | null>(null);
