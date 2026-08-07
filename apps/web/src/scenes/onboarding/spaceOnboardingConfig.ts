import { EYE_OFFSET } from "../gallery/resolveGallerySpawn.ts";

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

/**
 * 导览字牌(2026-08 重设计):HTML 活字,与探索 HUD 同一套字体/配色语言
 * (paper 文本 + 墨色投影;interactive 目标加 signal 左侧竖条;按键步骤附 keycap 行)。
 */
export type SpaceOnboardingSign = {
  id: SpaceOnboardingSignStepId;
  textKey: string;
  position: [number, number, number];
  hitSizeM: [number, number];
  tone?: "interactive";
  keycaps?: readonly string[];
  className?: string;
};

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
    hitSizeM: [4.1, 0.95],
    position: [-0.55, SPACE_ONBOARDING_EYE_LEVEL_Y, -45.9],
    className: "space-onboarding-sign--notice",
  },
  move: {
    id: "move",
    textKey: "space.onboarding.move",
    hitSizeM: [2.65, 0.66],
    position: [-0.55, SPACE_ONBOARDING_EYE_LEVEL_Y, -43.9],
    keycaps: ["W", "A", "S", "D"],
  },
  look: {
    id: "look",
    textKey: "space.onboarding.look",
    hitSizeM: [2.75, 0.68],
    position: [-2.55, SPACE_ONBOARDING_EYE_LEVEL_Y, -41.8],
    tone: "interactive",
    className: "space-onboarding-sign--side",
  },
  demo: {
    id: "demo",
    textKey: "space.onboarding.demo",
    hitSizeM: [2.65, 0.62],
    position: [-0.55, SPACE_ONBOARDING_EYE_LEVEL_Y, -39.6],
    tone: "interactive",
    className: "space-onboarding-sign--demo",
  },
  esc: {
    id: "esc",
    textKey: "space.onboarding.esc",
    hitSizeM: [2.1, 0.62],
    position: [1.85, SPACE_ONBOARDING_EYE_LEVEL_Y, -35.8],
    keycaps: ["Esc"],
    className: "space-onboarding-sign--side",
  },
  relock: {
    id: "relock",
    textKey: "space.onboarding.relock",
    hitSizeM: [3.35, 0.66],
    position: [1.85, SPACE_ONBOARDING_EYE_LEVEL_Y, -35.8],
    className: "space-onboarding-sign--side",
  },
  done: {
    id: "done",
    textKey: "space.onboarding.done",
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
