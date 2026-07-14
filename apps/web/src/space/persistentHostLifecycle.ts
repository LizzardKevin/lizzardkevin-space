import type { SpacePlayerPose } from "./spaceDailyResume";

export type PersistentHostLifecycle = ReturnType<typeof createPersistentHostLifecycle>;

export function completeEntryAfterHostReady(startFade: () => void) {
  startFade();
}

export function createPersistentHostLifecycle() {
  const hostIdentity = Object.freeze({ kind: "persistent-space-host" as const });
  let started = false;
  let livePose: SpacePlayerPose | null = null;
  let route = "/";

  return {
    hostIdentity,
    get started() {
      return started;
    },
    get livePose() {
      return livePose;
    },
    get route() {
      return route;
    },
    trustedEnter() {
      if (started) return false;
      started = true;
      return true;
    },
    observeRoute(nextRoute: string) {
      route = nextRoute;
    },
    recordPose(pose: SpacePlayerPose) {
      livePose = {
        position: [...pose.position],
        yawRad: pose.yawRad,
        pitchRad: pose.pitchRad,
      };
    },
  };
}
