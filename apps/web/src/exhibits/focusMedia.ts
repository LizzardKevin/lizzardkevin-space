import type { ExhibitManifestItem } from "./manifest.ts";
import type { SelectedWorkImage } from "./selectedWorkMedia.ts";

export type FocusMediaItem =
  | { kind: "model"; url: string }
  | { kind: "video"; url: string }
  | { kind: "image"; url: string };

export function getFocusMediaItems(
  exhibit: Pick<ExhibitManifestItem, "focusGlbUrl" | "media">,
  selectedImages?: readonly SelectedWorkImage[],
) {
  const items: FocusMediaItem[] = [{ kind: "model", url: exhibit.focusGlbUrl }];
  if (exhibit.media?.videoUrl?.trim()) {
    items.push({ kind: "video", url: exhibit.media.videoUrl });
  }
  const settledSelectedImages = selectedImages?.some((image) => image.status === "loading")
    ? []
    : selectedImages;
  const imageUrls = settledSelectedImages
    ? settledSelectedImages.flatMap((image) =>
        image.status === "loaded" && image.displayUrl ? [image.displayUrl] : [],
      )
    : exhibit.media?.imageUrls ?? [];
  for (const url of imageUrls) {
    if (url.trim()) items.push({ kind: "image", url });
  }
  return items;
}

export function nextFocusMediaIndex(currentIndex: number, direction: -1 | 1, itemCount: number) {
  if (itemCount <= 1) return 0;
  return (currentIndex + direction + itemCount) % itemCount;
}

export function resolveFocusMediaDragStep(
  mediaKind: FocusMediaItem["kind"],
  deltaX: number,
  deltaY: number,
  thresholdPx = 42,
): -1 | 0 | 1 {
  if (mediaKind !== "image") return 0;
  if (Math.abs(deltaX) < thresholdPx) return 0;
  if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.1) return 0;
  return deltaX < 0 ? 1 : -1;
}
