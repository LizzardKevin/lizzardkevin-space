import { generatedExhibitLabels } from "../generated/exhibitLabels.generated.ts";

export const knownExhibitIds = Object.freeze(Object.keys(generatedExhibitLabels));

const EXHIBIT_IDS = new Set(knownExhibitIds);

export function isKnownExhibitId(exhibitId: string) {
  return EXHIBIT_IDS.has(exhibitId);
}
