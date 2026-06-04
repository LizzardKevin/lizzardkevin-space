import { exhibitAudioUrl, exhibitVideoUrl } from "./exhibitMediaPaths";

export type ExhibitType = "model3d" | "image" | "audio" | "video";

export type ExhibitButtonAction =
  | { action: "play" }
  | { action: "pause" }
  | { action: "toggle" }
  | { action: "end" }
  | { action: "seekBy"; seconds: number }
  | { action: "seekTo"; seconds: number };

export type ExhibitManifestItem = {
  exhibitId: string;
  focusGlbUrl: string;
  type: ExhibitType;
  media?: {
    audioUrl?: string;
    videoUrl?: string;
  };
  buttons?: Record<string, ExhibitButtonAction>;
};

export type ExhibitManifest = { exhibits: ExhibitManifestItem[] };

function resolveExhibitMedia(item: ExhibitManifestItem): ExhibitManifestItem {
  const media = { ...item.media };
  if (item.type === "audio" && !media.audioUrl) {
    media.audioUrl = exhibitAudioUrl(item.exhibitId);
  }
  if (item.type === "video" && !media.videoUrl) {
    media.videoUrl = exhibitVideoUrl(item.exhibitId);
  }
  const hasMedia = media.audioUrl || media.videoUrl;
  return hasMedia ? { ...item, media } : item;
}

export async function loadManifest(): Promise<ExhibitManifest> {
  const res = await fetch("/exhibits/manifest.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load manifest: ${res.status}`);
  const raw = (await res.json()) as ExhibitManifest;
  return {
    exhibits: raw.exhibits.map(resolveExhibitMedia),
  };
}

