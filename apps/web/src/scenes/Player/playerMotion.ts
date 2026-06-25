export const WALK_HEAD_BOB_AMPLITUDE_M = 0.026;
export const WALK_HEAD_BOB_SPEED = 11.5;

export function walkHeadBobOffset(phase: number, blend: number) {
  const t = Math.max(0, Math.min(1, blend));
  return Math.sin(phase) * WALK_HEAD_BOB_AMPLITUDE_M * t;
}

export type LandingStepInput = {
  wasGrounded: boolean;
  grounded: boolean;
  landingStepArmed: boolean;
};

export function nextLandingStepState({
  wasGrounded,
  grounded,
  landingStepArmed,
}: LandingStepInput) {
  let nextLandingStepArmed = landingStepArmed || (wasGrounded && !grounded);
  const shouldPlayLandingStep = !wasGrounded && grounded && nextLandingStepArmed;

  if (grounded) nextLandingStepArmed = false;

  return {
    landingStepArmed: nextLandingStepArmed,
    shouldPlayLandingStep,
  };
}

export function initialPlayerSpawnMotionState() {
  return {
    grounded: true,
    verticalVelocity: 0,
    landingStepArmed: false,
  };
}
