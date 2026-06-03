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

export async function loadManifest(): Promise<ExhibitManifest> {
  const res = await fetch("/exhibits/manifest.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load manifest: ${res.status}`);
  return (await res.json()) as ExhibitManifest;
}

