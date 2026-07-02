import { publicAssetUrl } from "../../platform/publicAssets.ts";

export type ProjectorImageDirectoryEntry = {
  exhibitId: string;
  title: string;
  subtitle: string;
  imageFiles: readonly string[];
};

export const PROJECTOR_IMAGE_DIRECTORY_PUBLIC_PATH = "/exhibits/projector-selection";
export const PROJECTOR_IMAGE_DIRECTORY_WORKSPACE_PATH =
  "apps/web/public/exhibits/projector-selection";

export const PROJECTOR_IMAGE_DIRECTORY: readonly ProjectorImageDirectoryEntry[] = [
  {
    exhibitId: "arch_treehabitat",
    title: "Tree Habitat",
    subtitle: "selected images",
    imageFiles: [
      "optimized/FL-10.webp",
      "optimized/FL-12.webp",
      "optimized/FL-9.webp",
      "optimized/FL-13.webp",
      "optimized/FL-17.webp",
    ],
  },
];

export const PROJECTOR_TARGET_EXHIBIT_IDS = PROJECTOR_IMAGE_DIRECTORY.map(
  (entry) => entry.exhibitId,
);

export function buildProjectorSelectionImageUrl(
  directoryEntry: ProjectorImageDirectoryEntry,
  fileName: string,
) {
  return publicAssetUrl(
    `${PROJECTOR_IMAGE_DIRECTORY_PUBLIC_PATH}/${directoryEntry.exhibitId}/${fileName}`,
  );
}
