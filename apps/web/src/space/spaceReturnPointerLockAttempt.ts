export type SpaceReturnPointerLockAttemptSnapshot = {
  handoffArmed: boolean;
  inFlight: boolean;
  requestId: number | null;
};

export function createSpaceReturnPointerLockAttemptCoordinator() {
  let snapshot: SpaceReturnPointerLockAttemptSnapshot = {
    handoffArmed: false,
    inFlight: false,
    requestId: null,
  };

  return {
    begin(reserveRequestId: () => number) {
      if (snapshot.inFlight) {
        return { requestId: snapshot.requestId, started: false as const };
      }
      const requestId = reserveRequestId();
      snapshot = { handoffArmed: true, inFlight: true, requestId };
      return { requestId, started: true as const };
    },
    complete() {
      snapshot = { handoffArmed: false, inFlight: false, requestId: null };
    },
    fail(requestId: number) {
      if (!snapshot.inFlight || !snapshot.handoffArmed || snapshot.requestId !== requestId) {
        return false;
      }
      snapshot = { ...snapshot, handoffArmed: false };
      return true;
    },
    snapshot() {
      return { ...snapshot };
    },
  };
}
