import { useCallback, useReducer, useRef } from "react";
import type { EntryTransition } from "../entry/entryTypes";
import {
  INITIAL_ENTRY_TRANSITION_STATE,
  reduceEntryTransitionState,
} from "../entry/entryTransitionState";

export function useEntryTransition(): EntryTransition {
  const [{ entered, fading, hideButton }, dispatch] = useReducer(
    reduceEntryTransitionState,
    INITIAL_ENTRY_TRANSITION_STATE,
  );
  const enterWrapRef = useRef<HTMLDivElement>(null);

  const freezeButtonFloat = useCallback(() => {
    const wrap = enterWrapRef.current;
    if (!wrap) return;
    const floatEl = wrap.querySelector<HTMLElement>(".space-enterButtonFloat");
    if (!floatEl) return;
    const tr = getComputedStyle(floatEl).transform;
    if (tr && tr !== "none") {
      const y = new DOMMatrix(tr).m42;
      wrap.style.setProperty("--enter-float-y", `${y}px`);
      floatEl.style.transform = `translateY(${y}px)`;
    }
    floatEl.style.animation = "none";
  }, []);

  const beginLoading = useCallback(() => {
    dispatch({ type: "begin-loading" });
  }, []);

  const startFade = useCallback(() => {
    dispatch({ type: "start-fade" });
  }, []);

  const onSplashTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (!fading) return;
      dispatch({ type: "splash-transition-end" });
    },
    [fading],
  );

  const done = entered && !fading;
  const showSplash = !entered;

  return {
    entered,
    fading,
    hideButton,
    done,
    showSplash,
    enterWrapRef,
    freezeButtonFloat,
    beginLoading,
    startFade,
    onSplashTransitionEnd,
  };
}
