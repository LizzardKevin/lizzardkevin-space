export type SpaceFocusSurfaceState<T> = {
  focusOverlayExhibit: T | null;
  invalidFocusedRoute: boolean;
  onboardingFocusVisible: boolean;
  focusSurfaceOpen: boolean;
};

export type SpaceFocusSession<T> = {
  exhibit: T;
  exhibitId: string;
  phase: "active" | "closing";
  sessionId: number;
};

export type SpaceFocusSessionState<T> = {
  current: SpaceFocusSession<T> | null;
  nextSessionId: number;
};

export type SpaceFocusSessionEvent<T> =
  | { type: "route-sync"; entered: boolean; focused: T | null }
  | { type: "begin-dismiss"; sessionId: number }
  | { type: "finish-dismiss"; sessionId: number };

type FocusExhibit = { exhibitId: string };

export function createInitialSpaceFocusSessionState<T>(): SpaceFocusSessionState<T> {
  return { current: null, nextSessionId: 1 };
}

export function reduceSpaceFocusSession<T extends FocusExhibit>(
  state: SpaceFocusSessionState<T>,
  event: SpaceFocusSessionEvent<T>,
): SpaceFocusSessionState<T> {
  if (event.type === "route-sync") {
    if (!event.entered) {
      return state.current === null ? state : { ...state, current: null };
    }
    if (event.focused) {
      if (
        state.current?.phase === "active" &&
        state.current.exhibitId === event.focused.exhibitId
      ) {
        return state;
      }
      return {
        current: {
          exhibit: event.focused,
          exhibitId: event.focused.exhibitId,
          phase: "active",
          sessionId: state.nextSessionId,
        },
        nextSessionId: state.nextSessionId + 1,
      };
    }
    if (state.current?.phase === "closing") return state;
    return state.current === null ? state : { ...state, current: null };
  }

  if (event.type === "begin-dismiss") {
    if (
      state.current?.sessionId !== event.sessionId ||
      state.current.phase === "closing"
    ) {
      return state;
    }
    return { ...state, current: { ...state.current, phase: "closing" } };
  }

  if (
    state.current?.sessionId !== event.sessionId ||
    state.current.phase !== "closing"
  ) {
    return state;
  }
  return { ...state, current: null };
}

export function resolveSpaceFocusSurfaceState<T>({
  entered,
  focused,
  focusClosing,
  focusedRoutePending,
  onboardingFocusOpen,
  onboardingFocusClosing,
}: {
  entered: boolean;
  focused: T | null;
  focusClosing: T | null;
  focusedRoutePending: boolean;
  onboardingFocusOpen: boolean;
  onboardingFocusClosing: boolean;
}): SpaceFocusSurfaceState<T> {
  if (!entered) {
    return {
      focusOverlayExhibit: null,
      invalidFocusedRoute: false,
      onboardingFocusVisible: false,
      focusSurfaceOpen: false,
    };
  }

  const focusOverlayExhibit = focused ?? focusClosing;
  const invalidFocusedRoute = focusedRoutePending;
  const onboardingFocusVisible = onboardingFocusOpen || onboardingFocusClosing;
  return {
    focusOverlayExhibit,
    invalidFocusedRoute,
    onboardingFocusVisible,
    focusSurfaceOpen:
      focusOverlayExhibit !== null || onboardingFocusVisible || invalidFocusedRoute,
  };
}
