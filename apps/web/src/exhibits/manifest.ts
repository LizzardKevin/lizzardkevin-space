import { exhibitAudioUrl, exhibitVideoUrl } from "./exhibitMediaPaths.ts";

export type ExhibitType = "model3d" | "image" | "audio" | "video";

export type ExhibitScenePlacement = {
  snap: "floor" | "none";
  heightOffset: number;
  yawOffsetDeg: number;
};

export type ExhibitSceneLoad = {
  unloadDistance: number;
};

export type ExhibitSceneConfig = {
  distanceCenter: [number, number, number];
  modelUrl: string;
  scale: number | [number, number, number];
  placement: ExhibitScenePlacement;
  load: ExhibitSceneLoad;
};

export type RawExhibitSceneConfig = {
  distanceCenter: [number, number, number];
  modelUrl: string;
  scale?: number | [number, number, number];
  placement?: Partial<ExhibitScenePlacement>;
  load?: Partial<ExhibitSceneLoad>;
};

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
  scene?: ExhibitSceneConfig;
  media?: {
    audioUrl?: string;
    videoUrl?: string;
    imageUrls?: string[];
  };
  buttons?: Record<string, ExhibitButtonAction>;
};

export type ExhibitManifest = { exhibits: ExhibitManifestItem[] };

export const DEFAULT_EXHIBIT_SCENE_LOAD: ExhibitSceneLoad = {
  unloadDistance: 60,
};

export const DEFAULT_EXHIBIT_SCENE_PLACEMENT: ExhibitScenePlacement = {
  snap: "floor",
  heightOffset: 0,
  yawOffsetDeg: 0,
};

export function normalizeExhibitSceneConfig(scene: RawExhibitSceneConfig): ExhibitSceneConfig {
  return {
    distanceCenter: scene.distanceCenter,
    modelUrl: scene.modelUrl,
    scale: scene.scale ?? 1,
    placement: {
      ...DEFAULT_EXHIBIT_SCENE_PLACEMENT,
      ...scene.placement,
    },
    load: {
      ...DEFAULT_EXHIBIT_SCENE_LOAD,
      ...scene.load,
    },
  };
}

function resolveExhibitMedia(item: ExhibitManifestItem): ExhibitManifestItem {
  const media = { ...item.media };
  if (item.type === "audio" && !media.audioUrl) {
    media.audioUrl = exhibitAudioUrl(item.exhibitId);
  }
  if (item.type === "video" && !media.videoUrl) {
    media.videoUrl = exhibitVideoUrl(item.exhibitId);
  }
  const hasMedia = media.audioUrl || media.videoUrl || (media.imageUrls?.length ?? 0) > 0;
  const resolved = hasMedia ? { ...item, media } : item;
  return item.scene ? { ...resolved, scene: normalizeExhibitSceneConfig(item.scene) } : resolved;
}

export async function loadManifest(): Promise<ExhibitManifest> {
  const res = await fetch("/exhibits/manifest.json", { cache: "no-cache" });
  if (!res.ok) throw new Error(`Failed to load manifest: ${res.status}`);
  const raw = (await res.json()) as ExhibitManifest;
  return {
    exhibits: raw.exhibits.map(resolveExhibitMedia),
  };
}
