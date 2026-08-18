import { EYE_OFFSET } from "../gallery/resolveGallerySpawn.ts";
import { GALLERY_SPAWN } from "../gallery/galleryConfig.ts";

export type SpaceOnboardingStepId = "move" | "look" | "complete";
export type SpaceOnboardingSignStepId = Exclude<SpaceOnboardingStepId, "complete">;

export type SpaceOnboardingSign = {
  id: SpaceOnboardingSignStepId;
  textKey: `space.onboarding.${SpaceOnboardingSignStepId}`;
  position: [number, number, number];
  keycaps?: readonly string[];
};

export const SPACE_ONBOARDING_SPAWN: [number, number, number] = [...GALLERY_SPAWN];
export const SPACE_ONBOARDING_EYE_LEVEL_Y = Number(
  (SPACE_ONBOARDING_SPAWN[1] + EYE_OFFSET).toFixed(2),
);

export const SPACE_ONBOARDING_MOVE_DISTANCE_M = 1.4;
export const SPACE_ONBOARDING_LOOK_RADIANS = (7 * Math.PI) / 180;
export const SPACE_ONBOARDING_COMPLETE_FADE_MS = 320;
export const SPACE_ONBOARDING_MOVE_SIGN_AHEAD_M = 3.2;
export const SPACE_ONBOARDING_LOOK_SIGN_AHEAD_M = 6.2;

export const SPACE_ONBOARDING_SIGNS: Record<
  SpaceOnboardingSignStepId,
  SpaceOnboardingSign
> = {
  move: {
    id: "move",
    textKey: "space.onboarding.move",
    position: [
      SPACE_ONBOARDING_SPAWN[0],
      SPACE_ONBOARDING_EYE_LEVEL_Y,
      SPACE_ONBOARDING_SPAWN[2] + SPACE_ONBOARDING_MOVE_SIGN_AHEAD_M,
    ],
    keycaps: ["W", "A", "S", "D"],
  },
  look: {
    id: "look",
    textKey: "space.onboarding.look",
    position: [
      SPACE_ONBOARDING_SPAWN[0],
      SPACE_ONBOARDING_EYE_LEVEL_Y,
      SPACE_ONBOARDING_SPAWN[2] + SPACE_ONBOARDING_LOOK_SIGN_AHEAD_M,
    ],
  },
};
