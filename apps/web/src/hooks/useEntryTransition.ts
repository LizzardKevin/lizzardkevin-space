import { useCallback, useRef, useState } from "react";
import type { EntryTransition } from "../entry/entryTypes";

export function useEntryTransition(): EntryTransition {
  const [entered, setEntered] = useState(false);
  const [fading, setFading] = useState(false);
  const [hideButton, setHideButton] = useState(false);
  const enterWrapRef = useRef<HTMLDivElement>(null);

  const freezeButtonFloat = useCallback(() => {
    const wrap = enterWrapRef.current;
    if (!wrap) return;
    const tr = getComputedStyle(wrap).transform;
    if (tr && tr !== "none") {
      const y = new DOMMatrix(tr).m42;
      wrap.style.setProperty("--enter-float-y", `${y}px`);
      wrap.style.transform = `translateY(${y}px)`;
    }
    wrap.style.animation = "none";
  }, []);

  const startFade = useCallback(() => {
    setHideButton(true);
    setFading(true);
  }, []);

  const onSplashTransitionEnd = useCallback(
    (e: React.TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (!fading) return;
      setEntered(true);
      setFading(false);
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
    startFade,
    onSplashTransitionEnd,
  };
}
