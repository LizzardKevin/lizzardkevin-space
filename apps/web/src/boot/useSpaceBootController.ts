import { useCallback, useReducer } from "react";
import {
  INITIAL_SPACE_BOOT_STATE,
  spaceBootReducer,
  type SpaceBootMilestone,
  type SpaceBootState,
} from "./spaceBootReducer.ts";

export type SpaceBootController = Readonly<{
  state: SpaceBootState;
  start: () => void;
  retry: () => void;
  milestoneReady: (
    attemptId: number,
    milestone: Exclude<SpaceBootMilestone, "exhibits">,
  ) => void;
  manifestResolved: (attemptId: number, exhibitIds: readonly string[]) => void;
  exhibitReady: (attemptId: number, exhibitId: string) => void;
  exhibitFailed: (attemptId: number, exhibitId: string) => void;
  exhibitDeferred: (attemptId: number, exhibitId: string) => void;
  fail: (attemptId: number, error: unknown) => void;
  deviceLost: (attemptId: number, error: unknown) => void;
}>;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function useSpaceBootController(): SpaceBootController {
  const [state, dispatch] = useReducer(spaceBootReducer, INITIAL_SPACE_BOOT_STATE);
  const start = useCallback(() => dispatch({ type: "start" }), []);
  const retry = useCallback(() => dispatch({ type: "retry" }), []);
  const milestoneReady = useCallback(
    (attemptId: number, milestone: Exclude<SpaceBootMilestone, "exhibits">) => {
      dispatch({ type: "milestone-ready", attemptId, milestone });
    },
    [],
  );
  const manifestResolved = useCallback((attemptId: number, exhibitIds: readonly string[]) => {
    dispatch({ type: "manifest-resolved", attemptId, exhibitIds });
  }, []);
  const exhibitReady = useCallback((attemptId: number, exhibitId: string) => {
    dispatch({ type: "exhibit-ready", attemptId, exhibitId });
  }, []);
  const exhibitFailed = useCallback((attemptId: number, exhibitId: string) => {
    dispatch({ type: "exhibit-failed", attemptId, exhibitId });
  }, []);
  const exhibitDeferred = useCallback((attemptId: number, exhibitId: string) => {
    dispatch({ type: "exhibit-deferred", attemptId, exhibitId });
  }, []);
  const fail = useCallback((attemptId: number, error: unknown) => {
    dispatch({ type: "failed", attemptId, error: errorMessage(error) });
  }, []);
  const deviceLost = useCallback((attemptId: number, error: unknown) => {
    dispatch({ type: "device-lost", attemptId, error: errorMessage(error) });
  }, []);

  return {
    state,
    start,
    retry,
    milestoneReady,
    manifestResolved,
    exhibitReady,
    exhibitFailed,
    exhibitDeferred,
    fail,
    deviceLost,
  };
}
