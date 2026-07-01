import { useEffect, useMemo, useRef, useState } from "react";
import {
  nextProjectorSlideIndex,
  resolveProjectorNextState,
  resolveProjectorPreviousState,
  type ProjectorSlide,
  type ProjectorSlideCommand,
  type ProjectorSlideState,
} from "./projectorSlides";

export function useProjectorSlideshow({
  slides,
  command,
}: {
  slides: ProjectorSlide[];
  command: ProjectorSlideCommand | null;
}) {
  const [state, setState] = useState<ProjectorSlideState>({
    activeIndex: 0,
    history: [],
  });
  const lastHandledCommandNonceRef = useRef(command?.nonce ?? 0);
  const safeActiveIndex =
    slides.length === 0 ? 0 : Math.min(Math.max(0, state.activeIndex), slides.length - 1);
  const safeHistory = useMemo(
    () => state.history.filter((index) => index >= 0 && index < slides.length),
    [slides.length, state.history],
  );
  const safePreloadIndex = useMemo(
    () =>
      slides.length <= 1
        ? null
        : nextProjectorSlideIndex(safeActiveIndex, slides.length, () => 0),
    [safeActiveIndex, slides.length],
  );

  useEffect(() => {
    if (!command || slides.length === 0) return;
    if (command.nonce <= lastHandledCommandNonceRef.current) return;
    lastHandledCommandNonceRef.current = command.nonce;
    queueMicrotask(() => {
      setState((current) =>
        command.direction === "next"
          ? resolveProjectorNextState(current.activeIndex, slides.length, current.history)
          : resolveProjectorPreviousState(current.activeIndex, slides.length, current.history),
      );
    });
  }, [command, slides.length]);

  return {
    activeIndex: safeActiveIndex,
    activeSlide: slides[safeActiveIndex] ?? null,
    preloadSlide: safePreloadIndex === null ? null : (slides[safePreloadIndex] ?? null),
    history: safeHistory,
  };
}
