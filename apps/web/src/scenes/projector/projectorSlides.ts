import type { ExhibitManifestItem } from "../../exhibits/manifest.ts";
import {
  PROJECTOR_IMAGE_DIRECTORY,
  buildProjectorSelectionImageUrl,
  type ProjectorImageDirectoryEntry,
} from "./projectorImageDirectory.ts";

export { PROJECTOR_TARGET_EXHIBIT_IDS } from "./projectorImageDirectory.ts";

type ProjectorExhibitSource = Pick<ExhibitManifestItem, "exhibitId" | "media">;

export type ProjectorSlideDirection = "next" | "previous";

export type ProjectorSlideCommand = {
  nonce: number;
  direction: ProjectorSlideDirection;
};

export type ProjectorSlide = {
  exhibitId: string;
  imageUrl: string;
  title: string;
  subtitle: string;
};

export type ProjectorSlideState = {
  activeIndex: number;
  history: number[];
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

function safeProjectorSlideIndex(index: number, slideCount: number) {
  if (slideCount <= 0) return 0;
  return ((index % slideCount) + slideCount) % slideCount;
}

function sanitizeProjectorHistory(history: readonly number[], slideCount: number) {
  if (slideCount <= 0) return [];
  return history.filter((index) => Number.isInteger(index) && index >= 0 && index < slideCount);
}

export function resolveProjectorNextState(
  currentIndex: number,
  slideCount: number,
  history: readonly number[] = [],
  random: () => number = Math.random,
): ProjectorSlideState {
  const safeCurrent = safeProjectorSlideIndex(currentIndex, slideCount);
  const safeHistory = sanitizeProjectorHistory(history, slideCount);
  if (slideCount <= 1) {
    return { activeIndex: safeCurrent, history: safeHistory };
  }

  return {
    activeIndex: nextProjectorSlideIndex(safeCurrent, slideCount, random),
    history: [...safeHistory, safeCurrent],
  };
}

export function resolveProjectorPreviousState(
  currentIndex: number,
  slideCount: number,
  history: readonly number[] = [],
): ProjectorSlideState {
  const safeCurrent = safeProjectorSlideIndex(currentIndex, slideCount);
  const safeHistory = sanitizeProjectorHistory(history, slideCount);
  const previousIndex = safeHistory.at(-1);
  if (previousIndex === undefined) {
    return { activeIndex: safeCurrent, history: safeHistory };
  }

  return {
    activeIndex: previousIndex,
    history: safeHistory.slice(0, -1),
  };
}
