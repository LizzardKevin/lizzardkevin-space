import type { ExhibitContent } from "./exhibitContent.ts";
import { formatExhibitLabel } from "./exhibitTarget.ts";
import type { SupportedLanguage } from "../i18n/resolveInitialLanguage.ts";

export function resolveFocusDisplayTitle(
  content: Pick<ExhibitContent, "title"> | null | undefined,
  exhibitId: string,
  language: SupportedLanguage = "en",
) {
  const title = content?.title.trim();
  return title || formatExhibitLabel(exhibitId, language);
}
