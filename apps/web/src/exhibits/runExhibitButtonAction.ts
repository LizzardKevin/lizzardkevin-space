import type { ExhibitButtonAction, ExhibitType } from "./manifest";

export type ExhibitPlaybackApi = {
  playAudio: (url: string) => void;
  playVideo: (url: string) => void;
  pause: () => void;
  stop: () => void;
  toggle: () => void;
  seekBy: (seconds: number) => void;
  seekTo: (seconds: number) => void;
};

export function runExhibitButtonAction(
  action: ExhibitButtonAction,
  playback: ExhibitPlaybackApi,
  media?: { audioUrl?: string; videoUrl?: string },
  exhibitType?: ExhibitType,
) {
  const playPrimary = () => {
    const videoUrl = media?.videoUrl;
    const audioUrl = media?.audioUrl;
    if (exhibitType === "video" && videoUrl) {
      playback.playVideo(videoUrl);
      return;
    }
    if (videoUrl && !audioUrl) {
      playback.playVideo(videoUrl);
      return;
    }
    if (audioUrl) playback.playAudio(audioUrl);
  };

  switch (action.action) {
    case "play":
      playPrimary();
      break;
    case "pause":
      playback.pause();
      break;
    case "end":
      playback.stop();
      break;
    case "toggle":
      playback.toggle();
      break;
    case "seekBy":
      playback.seekBy(action.seconds);
      break;
    case "seekTo":
      playback.seekTo(action.seconds);
      break;
  }
}
