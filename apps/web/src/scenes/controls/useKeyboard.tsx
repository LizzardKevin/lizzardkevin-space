import { useEffect, useMemo } from "react";

type KeysState = Record<string, boolean>;

export function useKeyboard() {
  const state = useMemo<KeysState>(() => ({}), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      state[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      state[e.code] = false;
    };
    const onBlur = () => {
      Object.keys(state).forEach((code) => {
        state[code] = false;
      });
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [state]);

  return state;
}

