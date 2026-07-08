import { generatedDevStoriesByLanguage } from "../generated/devStories.generated.ts";
import type { SupportedLanguage } from "../i18n/resolveInitialLanguage";

export type DevStory = {
  id: string;
  number: string;
  period: string;
  title: string;
  summary: string;
  built: string[];
  trouble: string[];
  next: string;
  tags: string[];
};

const devStoriesByLanguage = generatedDevStoriesByLanguage as Record<SupportedLanguage, DevStory[]>;

export function getDevStories(language: SupportedLanguage): DevStory[] {
  return devStoriesByLanguage[language] ?? devStoriesByLanguage.en;
}

export const devStories: DevStory[] = devStoriesByLanguage.zh;
