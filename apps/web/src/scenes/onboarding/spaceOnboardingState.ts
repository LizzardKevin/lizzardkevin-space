import {
  SPACE_ONBOARDING_LOOK_RADIANS,
  SPACE_ONBOARDING_MOVE_DISTANCE_M,
  type SpaceOnboardingStepId,
} from "./spaceOnboardingConfig.ts";

export type SpaceOnboardingState = {
  step: SpaceOnboardingStepId;
  completed: boolean;
};

export type SpaceOnboardingEvent =
  | { type: "moveProgress"; distanceM: number }
  | { type: "lookChanged"; radians: number };

export function createInitialSpaceOnboardingState(): SpaceOnboardingState {
  return { step: "move", completed: false };
}

export function reduceSpaceOnboardingState(
  state: SpaceOnboardingState,
  event: SpaceOnboardingEvent,
): SpaceOnboardingState {
  if (state.completed) return state;

  if (state.step === "move") {
    return event.type === "moveProgress" && event.distanceM >= SPACE_ONBOARDING_MOVE_DISTANCE_M
      ? { step: "look", completed: false }
      : state;
  }

  if (state.step === "look") {
    return event.type === "lookChanged" && event.radians >= SPACE_ONBOARDING_LOOK_RADIANS
      ? { step: "complete", completed: true }
      : state;
  }

  return state;
}
