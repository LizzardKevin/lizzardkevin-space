import { advanceGalleryMotion, resolveGalleryCopyCount, wrapGalleryScrollLeft, WORK_GALLERY_FLOW_SPEED_PX_S } from "./workGalleryFlow.ts";
import { observeGalleryVisibility } from "../../scroll/useGalleryEntrance.ts";

export function measureGallerySetWidth(track: HTMLElement, itemCount: number): number {
  const first = track.children[0], marker = track.children[itemCount];
  if (!(first instanceof HTMLElement) || !(marker instanceof HTMLElement)) return 0;
  return marker.getBoundingClientRect().left - first.getBoundingClientRect().left;
}

/** The former independent drag hook is now the single DOM motion owner. */
export function bindGalleryMotion(track: HTMLElement, { itemCount, looping, reduced, isPaused, onCopyCount, onMotionChange }: {
  itemCount: number; looping: boolean; reduced: boolean;
  isPaused: () => boolean; onCopyCount: (count: number) => void; onMotionChange: () => void;
}): () => void {
  let period = 0, position = 0, written = 0, velocity = looping ? WORK_GALLERY_FLOW_SPEED_PX_S : 0;
  let pointer: number | null = null, startX = 0, lastX = 0, lastMove = 0, moved = false;
  let suppressClickUntil = 0, raf = 0, lastAt = 0, visible = true;
  track.scrollLeft = 0;
  const write = () => {
    position = looping ? wrapGalleryScrollLeft(position, period) : Math.max(0, Math.min(position, track.scrollWidth - track.clientWidth));
    track.scrollLeft = position;
    written = track.scrollLeft;
  };
  const measure = () => {
    const next = looping ? measureGallerySetWidth(track, itemCount) : 0;
    if (next > 0) {
      if (period > 0) position *= next / period;
      period = next;
      onCopyCount(resolveGalleryCopyCount(track.clientWidth, period));
      write();
    }
    track.dataset.flowPeriod = String(period);
  };
  const tick = (now: number) => {
    raf = 0;
    const dt = lastAt ? Math.min((now - lastAt) / 1000, .05) : 0;
    lastAt = now;
    const keyboardFocus = track.querySelector(":focus-visible") !== null;
    const stopped = isPaused() || keyboardFocus || pointer !== null;
    if (Math.abs(track.scrollLeft - written) > 1) position = track.scrollLeft;
    if (!stopped && (!looping || period > 0)) {
      const next = advanceGalleryMotion(velocity, dt, looping ? WORK_GALLERY_FLOW_SPEED_PX_S : 0);
      velocity = reduced ? 0 : next.velocity;
      position += reduced ? 0 : next.distance;
      write();
    }
    track.dataset.flowVelocity = String(stopped ? 0 : velocity);
    track.dataset.flowState = pointer !== null ? "dragging" : stopped ? "paused" : "flowing";
    if (visible && !document.hidden) raf = requestAnimationFrame(tick);
  };
  const resume = () => {
    if (document.hidden || !visible) { cancelAnimationFrame(raf); raf = 0; lastAt = 0; }
    else if (!raf) { lastAt = 0; raf = requestAnimationFrame(tick); }
  };
  const onDown = (event: PointerEvent) => {
    if (pointer !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
    pointer = event.pointerId;
    startX = lastX = event.clientX; lastMove = event.timeStamp; moved = false; velocity = 0;
    position = track.scrollLeft;
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    if (!moved && Math.abs(event.clientX - startX) > 4) {
      moved = true; track.dataset.dragging = "true"; track.setPointerCapture(event.pointerId);
    }
    if (!moved) return;
    const delta = lastX - event.clientX;
    const dt = Math.max(1, event.timeStamp - lastMove);
    velocity = .55 * velocity + .45 * Math.max(-3000, Math.min(3000, delta / dt * 1000));
    position += delta; write(); lastX = event.clientX; lastMove = event.timeStamp;
  };
  const end = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    pointer = null; delete track.dataset.dragging;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    if (moved) {
      suppressClickUntil = Date.now() + 350;
      velocity *= Math.exp(-Math.max(0, event.timeStamp - lastMove - 50) / 100);
    }
    if (event.type === "pointercancel" || reduced) velocity = 0;
  };
  const click = (event: MouseEvent) => {
    if (Date.now() >= suppressClickUntil) return;
    suppressClickUntil = 0; event.preventDefault(); event.stopPropagation();
  };
  const resize = new ResizeObserver(measure);
  resize.observe(track);
  if (track.firstElementChild) resize.observe(track.firstElementChild);
  const stopObserving = observeGalleryVisibility(track, nextVisible => { visible = nextVisible; resume(); });
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const motionChanged = () => onMotionChange();
  motion.addEventListener("change", motionChanged);
  track.addEventListener("pointerdown", onDown);
  track.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", end);
  window.addEventListener("pointercancel", end);
  track.addEventListener("click", click, true);
  measure(); resume();
  return () => {
    cancelAnimationFrame(raf); resize.disconnect(); stopObserving();
    motion.removeEventListener("change", motionChanged);
    track.removeEventListener("pointerdown", onDown); track.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", end); window.removeEventListener("pointercancel", end);
    track.removeEventListener("click", click, true);
  };
}
