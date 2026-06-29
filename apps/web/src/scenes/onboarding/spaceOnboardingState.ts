import {
  SPACE_ONBOARDING_MOVE_DISTANCE_M,
  type SpaceOnboardingStepId,
} from "./spaceOnboardingConfig.ts";

export type SpaceOnboardingState = {
  step: SpaceOnboardingStepId;
  completed: boolean;
};

export type SpaceOnboardingEvent =
  | { type: "moveProgress"; distanceM: number }
  | { type: "lookChanged"; radians: number }
  | { type: "lookTargeted" }
  | { type: "demoGateReached" }
  | { type: "demoOpened" }
  | { type: "demoClosed" }
  | { type: "escUnlocked" }
  | { type: "relocked" }
  | { type: "doneViewed" };

export function createInitialSpaceOnboardingState(): SpaceOnboardingState {
  return { step: "move", completed: false };
}

function next(step: SpaceOnboardingStepId): SpaceOnboardingState {
  return { step, completed: false };
}

export function reduceSpaceOnboardingState(
  state: SpaceOnboardingState,
  event: SpaceOnboardingEvent,
): SpaceOnboardingState {
  if (state.completed) return state;

  switch (state.step) {
    case "move":
      if (event.type === "moveProgress" && event.distanceM >= SPACE_ONBOARDING_MOVE_DISTANCE_M) {
        return next("look");
      }
      return state;

    case "look":
      if (event.type === "lookTargeted") return next("demo");
      return state;

    case "demo":
      if (event.type === "demoOpened") return next("focus");
      return state;

    case "focus":
      if (event.type === "demoClosed") return next("esc");
      return state;

    case "esc":
      if (event.type === "escUnlocked") return next("relock");
      return state;

    case "relock":
      if (event.type === "relocked") return next("done");
      return state;

    case "done":
      if (event.type === "doneViewed") return { step: "done", completed: true };
      return state;
  }
}
