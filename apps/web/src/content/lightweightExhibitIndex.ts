import { generatedExhibitLabels } from "../generated/exhibitLabels.generated.ts";

const NON_EXHIBIT_LABEL_IDS = new Set(["space_onboarding_demo"]);

export const knownExhibitIds = Object.freeze(
  Object.keys(generatedExhibitLabels).filter((id) => !NON_EXHIBIT_LABEL_IDS.has(id)),
);

const EXHIBIT_IDS = new Set(knownExhibitIds);

export function isKnownExhibitId(exhibitId: string) {
  return EXHIBIT_IDS.has(exhibitId);
}
