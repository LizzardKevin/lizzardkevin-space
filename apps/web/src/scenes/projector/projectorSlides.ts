import type { ExhibitManifestItem } from "../../exhibits/manifest.ts";
import {
  PROJECTOR_IMAGE_DIRECTORY,
  buildProjectorSelectionImageUrl,
  type ProjectorImageDirectoryEntry,
} from "./projectorImageDirectory.ts";

export { PROJECTOR_TARGET_EXHIBIT_IDS } from "./projectorImageDirectory.ts";
export const PROJECTOR_SLIDE_DURATION_MS = 8000;
export const PROJECTOR_REDUCED_MOTION_SLIDE_DURATION_MS = 16000;
export const PROJECTOR_CROSSFADE_MS = 750;

type ProjectorExhibitSource = Pick<ExhibitManifestItem, "exhibitId" | "media">;

export type ProjectorSlide = {
  exhibitId: string;
  imageUrl: string;
  title: string;
  subtitle: string;
};

function selectProjectorImageUrls(directoryEntry: ProjectorImageDirectoryEntry) {
  return directoryEntry.imageFiles
    .map((fileName) => fileName.trim())
    .filter(Boolean)
    .map((fileName) => buildProjectorSelectionImageUrl(directoryEntry, fileName));
}

export function buildProjectorSlides(
  exhibits: ProjectorExhibitSource[],
  directory: readonly ProjectorImageDirectoryEntry[] = PROJECTOR_IMAGE_DIRECTORY,
): ProjectorSlide[] {
  const exhibitsById = new Map(exhibits.map((exhibit) => [exhibit.exhibitId, exhibit]));
  const slides: ProjectorSlide[] = [];

  for (const directoryEntry of directory) {
    const exhibit = exhibitsById.get(directoryEntry.exhibitId);
    if (!exhibit) continue;
    for (const imageUrl of selectProjectorImageUrls(directoryEntry)) {
      slides.push({
        exhibitId: exhibit.exhibitId,
        imageUrl,
        title: directoryEntry.title,
        subtitle: directoryEntry.subtitle,
      });
    }
  }

  return slides;
}

export function nextProjectorSlideIndex(
  currentIndex: number,
  slideCount: number,
  random: () => number = Math.random,
) {
  if (slideCount <= 1) return 0;
  const safeCurrent = ((currentIndex % slideCount) + slideCount) % slideCount;
  const nextWithoutCurrent = Math.min(slideCount - 2, Math.floor(random() * (slideCount - 1)));
  return nextWithoutCurrent >= safeCurrent ? nextWithoutCurrent + 1 : nextWithoutCurrent;
}
