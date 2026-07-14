export type EntryTransitionState = {
  entered: boolean;
  fading: boolean;
  hideButton: boolean;
};

export type EntryTransitionAction =
  | { type: "begin-loading" }
  | { type: "start-fade" }
  | { type: "splash-transition-end" };

export const INITIAL_ENTRY_TRANSITION_STATE: EntryTransitionState = {
  entered: false,
  fading: false,
  hideButton: false,
};

export function reduceEntryTransitionState(
  state: EntryTransitionState,
  action: EntryTransitionAction,
): EntryTransitionState {
  if (action.type === "begin-loading") {
    return state.hideButton ? state : { ...state, hideButton: true };
  }
  if (action.type === "start-fade") {
    return state.fading && state.hideButton ? state : { ...state, fading: true, hideButton: true };
  }
  if (!state.fading) return state;
  return { ...state, entered: true, fading: false };
}
