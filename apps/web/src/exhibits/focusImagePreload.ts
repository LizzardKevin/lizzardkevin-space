import type { FocusMediaItem } from "./focusMedia.ts";

export type PreloadedFocusImage = {
  image: HTMLImageElement;
  ready: Promise<void>;
  url: string;
};

type CreateFocusImage = () => HTMLImageElement;

export function preloadFocusImages(
  mediaItems: FocusMediaItem[],
  createImage: CreateFocusImage = () => new Image(),
): PreloadedFocusImage[] {
  return mediaItems.flatMap((item) => {
    if (item.kind !== "image") return [];

    const image = createImage();
    image.decoding = "async";
    image.loading = "eager";
    image.src = item.url;

    const ready =
      typeof image.decode === "function"
        ? image.decode().catch(() => undefined)
        : Promise.resolve();

    return [
      {
        image,
        ready: ready.then(() => undefined),
        url: item.url,
      },
    ];
  });
}
