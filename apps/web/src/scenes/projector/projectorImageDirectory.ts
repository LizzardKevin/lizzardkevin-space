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
    imageFiles: ["FL-10.jpg", "FL-12.jpg", "FL-9.jpg", "FL-13.jpg", "FL-17.jpg"],
  },
];

export const PROJECTOR_TARGET_EXHIBIT_IDS = PROJECTOR_IMAGE_DIRECTORY.map(
  (entry) => entry.exhibitId,
);

export function buildProjectorSelectionImageUrl(
  directoryEntry: ProjectorImageDirectoryEntry,
  fileName: string,
) {
  return `${PROJECTOR_IMAGE_DIRECTORY_PUBLIC_PATH}/${directoryEntry.exhibitId}/${fileName}`;
}
