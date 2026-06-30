import { useEffect, useMemo, useState } from "react";
import {
  PROJECTOR_CROSSFADE_MS,
  PROJECTOR_REDUCED_MOTION_SLIDE_DURATION_MS,
  PROJECTOR_SLIDE_DURATION_MS,
  nextProjectorSlideIndex,
  type ProjectorSlide,
} from "./projectorSlides";

function readPrefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readPageVisible() {
  if (typeof document === "undefined") return true;
  return document.visibilityState !== "hidden";
}

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(readPrefersReducedMotion);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return prefersReducedMotion;
}

function usePageVisible() {
  const [visible, setVisible] = useState(readPageVisible);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return visible;
}

export function useProjectorSlideshow({
  slides,
  playing,
}: {
  slides: ProjectorSlide[];
  playing: boolean;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const pageVisible = usePageVisible();
  const [activeIndex, setActiveIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const safeActiveIndex = slides.length === 0 ? 0 : Math.min(activeIndex, slides.length - 1);
  const safePreviousIndex = useMemo(() => {
    if (previousIndex === null || previousIndex >= slides.length) return null;
    return previousIndex;
  }, [previousIndex, slides.length]);

  useEffect(() => {
    if (!playing || !pageVisible || slides.length <= 1) return;
    const duration = prefersReducedMotion
      ? PROJECTOR_REDUCED_MOTION_SLIDE_DURATION_MS
      : PROJECTOR_SLIDE_DURATION_MS;
    const timer = window.setTimeout(() => {
      const nextIndex = nextProjectorSlideIndex(safeActiveIndex, slides.length);
      setPreviousIndex(prefersReducedMotion ? null : safeActiveIndex);
      setActiveIndex(nextIndex);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [pageVisible, playing, prefersReducedMotion, safeActiveIndex, slides.length]);

  useEffect(() => {
    if (previousIndex === null) return;
    const timer = window.setTimeout(() => {
      setPreviousIndex(null);
    }, PROJECTOR_CROSSFADE_MS + 80);
    return () => window.clearTimeout(timer);
  }, [previousIndex]);

  return {
    activeIndex: safeActiveIndex,
    previousIndex: safePreviousIndex,
    activeSlide: slides[safeActiveIndex] ?? null,
    previousSlide: safePreviousIndex === null ? null : (slides[safePreviousIndex] ?? null),
    prefersReducedMotion,
  };
}
