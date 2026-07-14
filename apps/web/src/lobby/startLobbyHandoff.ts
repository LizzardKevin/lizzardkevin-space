export type StartLobbyHandoffPhase =
  | "lobby"
  | "disposing"
  | "booting"
  | "failed"
  | "revealing"
  | "entered";

export type StartLobbyHandoffState = Readonly<{ phase: StartLobbyHandoffPhase }>;

export type StartLobbyHandoffAction =
  | { type: "trusted-enter" }
  | { type: "lobby-disposed" }
  | { type: "boot-running" }
  | { type: "boot-failed" }
  | { type: "retry" }
  | { type: "reveal-finished" };

export const INITIAL_START_LOBBY_HANDOFF_STATE: StartLobbyHandoffState = Object.freeze({
  phase: "lobby",
});

export const MAX_START_LOBBY_TILT_DEGREES = 6;

const MAX_START_LOBBY_TILT_RADIANS = (MAX_START_LOBBY_TILT_DEGREES * Math.PI) / 180;

function clampTilt(value: number) {
  return Math.max(-MAX_START_LOBBY_TILT_RADIANS, Math.min(MAX_START_LOBBY_TILT_RADIANS, value));
}

export function resolveStartLobbyTilt(
  clientX: number,
  clientY: number,
  width: number,
  height: number,
) {
  if (width <= 0 || height <= 0) return { x: 0, y: 0 };
  return {
    x: clampTilt(((height / 2 - clientY) / (height / 2)) * MAX_START_LOBBY_TILT_RADIANS),
    y: clampTilt(((clientX - width / 2) / (width / 2)) * MAX_START_LOBBY_TILT_RADIANS),
  };
}

export function reduceStartLobbyHandoff(
  state: StartLobbyHandoffState,
  action: StartLobbyHandoffAction,
): StartLobbyHandoffState {
  if (action.type === "trusted-enter") {
    return state.phase === "lobby" ? { phase: "disposing" } : state;
  }
  if (action.type === "lobby-disposed") {
    return state.phase === "disposing" ? { phase: "booting" } : state;
  }
  if (action.type === "boot-running") {
    return state.phase === "booting" ? { phase: "revealing" } : state;
  }
  if (action.type === "boot-failed") {
    return state.phase === "booting" || state.phase === "revealing"
      ? { phase: "failed" }
      : state;
  }
  if (action.type === "retry") {
    return state.phase === "failed" ? { phase: "booting" } : state;
  }
  return state.phase === "revealing" ? { phase: "entered" } : state;
}
