import type { ExhibitContent } from "./exhibitContent.ts";
import { formatExhibitLabel } from "./exhibitTarget.ts";

export function resolveFocusDisplayTitle(
  content: Pick<ExhibitContent, "title"> | null | undefined,
  exhibitId: string,
) {
  return content?.title ?? formatExhibitLabel(exhibitId);
}
