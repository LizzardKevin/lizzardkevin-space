import { EYE_OFFSET } from "../gallery/resolveGallerySpawn.ts";
import { publicAssetUrl } from "../../platform/publicAssets.ts";

export const SPACE_ONBOARDING_DEMO_EXHIBIT_ID = "space_onboarding_demo";
export const SPACE_ONBOARDING_LOOK_HIT_ID = "space_onboarding_look_target";

export type SpaceOnboardingStepId =
  | "notice"
  | "move"
  | "look"
  | "demo"
  | "focus"
  | "esc"
  | "relock"
  | "done";

export type SpaceOnboardingSignStepId = Exclude<SpaceOnboardingStepId, "focus">;

export type SpaceOnboardingSign = {
  id: SpaceOnboardingSignStepId;
  textKey: string;
  imageSrc: string;
  imageWidthPx: number;
  imageHeightPx: number;
  displayWidthPx: number;
  hitSizeM: [number, number];
  position: [number, number, number];
  className?: string;
};

export function resolveSpaceOnboardingSignImageSrc(
  sign: Pick<SpaceOnboardingSign, "imageSrc">,
  language?: string | null,
) {
  const imageSrc = !language?.toLowerCase().startsWith("en")
    ? sign.imageSrc
    : sign.imageSrc.replace(/\.png$/, "-en.png");
  return publicAssetUrl(imageSrc);
}

export const SPACE_ONBOARDING_SPAWN: [number, number, number] = [-0.51, 36.897, -48.32];
export const SPACE_ONBOARDING_EYE_LEVEL_Y = Number((SPACE_ONBOARDING_SPAWN[1] + EYE_OFFSET).toFixed(2));

export const SPACE_ONBOARDING_MOVE_DISTANCE_M = 1.4;
export const SPACE_ONBOARDING_LOOK_RADIANS = (7 * Math.PI) / 180;
export const SPACE_ONBOARDING_DEMO_GATE_Z = -41.2;
export const SPACE_ONBOARDING_NOTICE_VISIBLE_MS = 2000;
export const SPACE_ONBOARDING_DONE_VISIBLE_MS = 4200;

export const SPACE_ONBOARDING_SIGNS: Record<SpaceOnboardingSignStepId, SpaceOnboardingSign> = {
  notice: {
    id: "notice",
    textKey: "space.onboarding.notice",
    imageSrc: "/onboarding/space-onboarding-notice.png",
    imageWidthPx: 1500,
    imageHeightPx: 360,
    displayWidthPx: 620,
    hitSizeM: [4.1, 0.95],
    position: [-0.55, SPACE_ONBOARDING_EYE_LEVEL_Y, -45.9],
    className: "space-onboarding-sign--notice",
  },
  move: {
    id: "move",
    textKey: "space.onboarding.move",
    imageSrc: "/onboarding/space-onboarding-move.png",
    imageWidthPx: 1107,
    imageHeightPx: 280,
    displayWidthPx: 423,
    hitSizeM: [2.65, 0.66],
    position: [-0.55, SPACE_ONBOARDING_EYE_LEVEL_Y, -43.9],
  },
  look: {
    id: "look",
    textKey: "space.onboarding.look",
    imageSrc: "/onboarding/space-onboarding-look.png",
    imageWidthPx: 1176,
    imageHeightPx: 280,
    displayWidthPx: 454,
    hitSizeM: [2.75, 0.68],
    position: [-2.55, SPACE_ONBOARDING_EYE_LEVEL_Y, -41.8],
    className: "space-onboarding-sign--side",
  },
  demo: {
    id: "demo",
    textKey: "space.onboarding.demo",
    imageSrc: "/onboarding/space-onboarding-demo.png",
    imageWidthPx: 1267,
    imageHeightPx: 280,
    displayWidthPx: 495,
    hitSizeM: [2.65, 0.62],
    position: [-0.55, SPACE_ONBOARDING_EYE_LEVEL_Y, -39.6],
    className: "space-onboarding-sign--demo",
  },
  esc: {
    id: "esc",
    textKey: "space.onboarding.esc",
    imageSrc: "/onboarding/space-onboarding-esc.png",
    imageWidthPx: 875,
    imageHeightPx: 280,
    displayWidthPx: 359,
    hitSizeM: [2.1, 0.62],
    position: [1.85, SPACE_ONBOARDING_EYE_LEVEL_Y, -35.8],
    className: "space-onboarding-sign--side",
  },
  relock: {
    id: "relock",
    textKey: "space.onboarding.relock",
    imageSrc: "/onboarding/space-onboarding-relock.png",
    imageWidthPx: 1359,
    imageHeightPx: 280,
    displayWidthPx: 530,
    hitSizeM: [3.35, 0.66],
    position: [1.85, SPACE_ONBOARDING_EYE_LEVEL_Y, -35.8],
    className: "space-onboarding-sign--side",
  },
  done: {
    id: "done",
    textKey: "space.onboarding.done",
    imageSrc: "/onboarding/space-onboarding-done.png",
    imageWidthPx: 1206,
    imageHeightPx: 280,
    displayWidthPx: 470,
    hitSizeM: [2.95, 0.66],
    position: [-0.55, SPACE_ONBOARDING_EYE_LEVEL_Y, -33.6],
  },
};

export const SPACE_ONBOARDING_DEMO_HIT_OFFSET: [number, number, number] = [0, -0.02, 0];
export const SPACE_ONBOARDING_DEMO_HIT_POSITION: [number, number, number] = [
  SPACE_ONBOARDING_SIGNS.demo.position[0] + SPACE_ONBOARDING_DEMO_HIT_OFFSET[0],
  SPACE_ONBOARDING_SIGNS.demo.position[1] + SPACE_ONBOARDING_DEMO_HIT_OFFSET[1],
  SPACE_ONBOARDING_SIGNS.demo.position[2] + SPACE_ONBOARDING_DEMO_HIT_OFFSET[2],
];
export const SPACE_ONBOARDING_DEMO_TEXT_HIT_SIZE: [number, number] = [
  2.05,
  0.42,
];
export const SPACE_ONBOARDING_DEMO_HIT_SIZE: [number, number] = SPACE_ONBOARDING_DEMO_TEXT_HIT_SIZE;

export const SPACE_ONBOARDING_LOOK_HIT_OFFSET: [number, number, number] = [0, -0.02, 0];
export const SPACE_ONBOARDING_LOOK_HIT_POSITION: [number, number, number] = [
  SPACE_ONBOARDING_SIGNS.look.position[0] + SPACE_ONBOARDING_LOOK_HIT_OFFSET[0],
  SPACE_ONBOARDING_SIGNS.look.position[1] + SPACE_ONBOARDING_LOOK_HIT_OFFSET[1],
  SPACE_ONBOARDING_SIGNS.look.position[2] + SPACE_ONBOARDING_LOOK_HIT_OFFSET[2],
];
export const SPACE_ONBOARDING_LOOK_HIT_SIZE: [number, number, number] = [
  SPACE_ONBOARDING_SIGNS.look.hitSizeM[0],
  SPACE_ONBOARDING_SIGNS.look.hitSizeM[1],
  0.12,
];
