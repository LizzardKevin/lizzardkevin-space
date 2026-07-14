export type SpaceMotionPolicy = Readonly<{
  allowIdleCameraDrift: boolean;
  allowOnboardingFloat: boolean;
  allowHudAnimation: boolean;
}>;

export function resolveSpaceMotionPolicy(reducedMotion: boolean): SpaceMotionPolicy {
  return {
    allowIdleCameraDrift: !reducedMotion,
    allowOnboardingFloat: !reducedMotion,
    allowHudAnimation: !reducedMotion,
  };
}

export function readSpaceReducedMotionPreference() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
