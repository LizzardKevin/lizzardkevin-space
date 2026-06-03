export type PlaybackKind = "audio" | "video";

export type PlaybackState = {
  kind: PlaybackKind;
  url: string;
  playing: boolean;
  duration: number;
  currentTime: number;
};

