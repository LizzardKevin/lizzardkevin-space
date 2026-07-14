export type SpaceBootPhase = "idle" | "booting" | "running" | "failed";
export type SpaceBootMilestone =
  | "renderer"
  | "environment"
  | "gallery"
  | "physics"
  | "exhibits";

export type SpaceBootState = Readonly<{
  phase: SpaceBootPhase;
  attemptId: number;
  forceWebGL: boolean;
  deviceLossRecoveryUsed: boolean;
  manifestResolved: boolean;
  expectedExhibitIds: readonly string[];
  milestones: Readonly<Record<SpaceBootMilestone, boolean>>;
  items: Readonly<{
    loaded: number;
    total: number;
    failed: number;
    deferred: number;
    settledIds: readonly string[];
  }>;
  error: string | null;
}>;

export type SpaceBootAction =
  | { type: "start" }
  | { type: "retry" }
  | {
      type: "milestone-ready";
      attemptId: number;
      milestone: Exclude<SpaceBootMilestone, "exhibits">;
    }
  | { type: "manifest-resolved"; attemptId: number; exhibitIds: readonly string[] }
  | { type: "exhibit-ready"; attemptId: number; exhibitId: string }
  | { type: "exhibit-failed"; attemptId: number; exhibitId: string }
  | { type: "exhibit-deferred"; attemptId: number; exhibitId: string }
  | { type: "failed"; attemptId: number; error: string }
  | { type: "device-lost"; attemptId: number; error: string };

const EMPTY_MILESTONES = Object.freeze({
  renderer: false,
  environment: false,
  gallery: false,
  physics: false,
  exhibits: false,
});

const EMPTY_ITEMS = Object.freeze({
  loaded: 0,
  total: 0,
  failed: 0,
  deferred: 0,
  settledIds: Object.freeze([]) as readonly string[],
});

export const INITIAL_SPACE_BOOT_STATE: SpaceBootState = Object.freeze({
  phase: "idle",
  attemptId: 0,
  forceWebGL: false,
  deviceLossRecoveryUsed: false,
  manifestResolved: false,
  expectedExhibitIds: Object.freeze([]) as readonly string[],
  milestones: EMPTY_MILESTONES,
  items: EMPTY_ITEMS,
  error: null,
});

function beginAttempt(
  state: SpaceBootState,
  options?: { forceWebGL?: boolean; deviceLossRecoveryUsed?: boolean },
): SpaceBootState {
  return {
    phase: "booting",
    attemptId: state.attemptId + 1,
    forceWebGL: options?.forceWebGL ?? state.forceWebGL,
    deviceLossRecoveryUsed:
      options?.deviceLossRecoveryUsed ?? state.deviceLossRecoveryUsed,
    manifestResolved: false,
    expectedExhibitIds: [],
    milestones: EMPTY_MILESTONES,
    items: EMPTY_ITEMS,
    error: null,
  };
}

function allMilestonesReady(milestones: SpaceBootState["milestones"]) {
  return (
    milestones.renderer &&
    milestones.environment &&
    milestones.gallery &&
    milestones.physics &&
    milestones.exhibits
  );
}

function settleRunning(state: SpaceBootState): SpaceBootState {
  if (state.phase !== "booting" || !allMilestonesReady(state.milestones)) return state;
  return { ...state, phase: "running" };
}

function isCurrentAsyncAction(state: SpaceBootState, attemptId: number) {
  return state.attemptId === attemptId && (state.phase === "booting" || state.phase === "running");
}

function settleExhibit(
  state: SpaceBootState,
  exhibitId: string,
  result: "loaded" | "failed" | "deferred",
): SpaceBootState {
  if (
    state.phase === "running" ||
    !state.manifestResolved ||
    !state.expectedExhibitIds.includes(exhibitId) ||
    state.items.settledIds.includes(exhibitId)
  ) return state;
  const settledIds = [...state.items.settledIds, exhibitId];
  const items = {
    ...state.items,
    loaded: state.items.loaded + (result === "loaded" ? 1 : 0),
    failed: state.items.failed + (result === "failed" ? 1 : 0),
    deferred: state.items.deferred + (result === "deferred" ? 1 : 0),
    settledIds,
  };
  const exhibitsReady = state.expectedExhibitIds.every((id) => settledIds.includes(id));
  return settleRunning({
    ...state,
    items,
    milestones: exhibitsReady ? { ...state.milestones, exhibits: true } : state.milestones,
  });
}

export function spaceBootReducer(
  state: SpaceBootState,
  action: SpaceBootAction,
): SpaceBootState {
  if (action.type === "start") {
    return state.phase === "idle" ? beginAttempt(state) : state;
  }
  if (action.type === "retry") {
    return state.phase === "failed" ? beginAttempt(state) : state;
  }
  if (!isCurrentAsyncAction(state, action.attemptId)) return state;

  if (action.type === "failed") {
    return { ...state, phase: "failed", error: action.error };
  }
  if (action.type === "device-lost") {
    if (state.deviceLossRecoveryUsed) {
      return { ...state, phase: "failed", error: action.error };
    }
    return beginAttempt(state, {
      forceWebGL: true,
      deviceLossRecoveryUsed: true,
    });
  }
  if (state.phase === "running") return state;

  if (action.type === "milestone-ready") {
    if (state.milestones[action.milestone]) return state;
    return settleRunning({
      ...state,
      milestones: { ...state.milestones, [action.milestone]: true },
    });
  }
  if (action.type === "manifest-resolved") {
    if (state.manifestResolved) return state;
    const exhibitIds = Object.freeze([...new Set(action.exhibitIds)]);
    return settleRunning({
      ...state,
      manifestResolved: true,
      expectedExhibitIds: exhibitIds,
      items: { loaded: 0, total: exhibitIds.length, failed: 0, deferred: 0, settledIds: [] },
      milestones:
        exhibitIds.length === 0
          ? { ...state.milestones, exhibits: true }
          : state.milestones,
    });
  }
  if (action.type === "exhibit-ready") {
    return settleExhibit(state, action.exhibitId, "loaded");
  }
  if (action.type === "exhibit-deferred") {
    return settleExhibit(state, action.exhibitId, "deferred");
  }
  return settleExhibit(state, action.exhibitId, "failed");
}
