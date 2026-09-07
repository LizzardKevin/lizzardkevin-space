import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../scroll/useLenisScroll";
import { bindGalleryMotion } from "./useDragScroll";


/** One owner for drag, momentum, native scroll reconciliation and automatic flow. */
export function useGalleryAutoFlow({ itemCount, paused, identity }: {
  itemCount: number; paused: boolean; identity: string | undefined;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [mountVersion, setMountVersion] = useState(0);
  const galleryRef = useCallback((node: HTMLDivElement | null) => {
    trackRef.current = node;
    setMountVersion(version => version + 1);
  }, []);
  const [copies, setCopies] = useState(2);
  const [, refreshMotion] = useState(0);
  const pausedRef = useRef(paused);
  useLayoutEffect(() => { pausedRef.current = paused; }, [paused]);
  const reduced = prefersReducedMotion();
  const looping = itemCount >= 2 && !reduced && !(import.meta.env.DEV && new URLSearchParams(location.search).get("wpGalleryFlow") === "0");

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || itemCount < 2) return;
    return bindGalleryMotion(track, {
      itemCount, looping, reduced,
      isPaused: () => pausedRef.current,
      onCopyCount: setCopies,
      onMotionChange: () => refreshMotion(current => current + 1),
    });
  }, [mountVersion, itemCount, identity, looping, reduced]);
  return { galleryRef, galleryCopies: looping ? Math.max(2, copies) : 1 };
}
