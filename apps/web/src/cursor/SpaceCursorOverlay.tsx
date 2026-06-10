import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { releaseSpacePointerLock, resumeSpaceFirstPerson } from "../space/requestSpacePointerLock";
import { setSpaceCursorReturnHandler } from "./spaceCursorController";

const RETURN_MS = 500;
const SCROLL_PARTICLE_MS = 360;
const MAX_SCROLL_BURSTS = 5;

type CursorMode = "default" | "hover" | "text" | "dragReady" | "dragging";
type ScrollBurst = { id: number; direction: "up" | "down" };

function isInteractiveElement(el: Element | null) {
  return !!el?.closest(
    [
      "button",
      "a[href]",
      "input",
      "textarea",
      "select",
      "summary",
      "[role='button']",
      "[data-cursor='interactive']",
    ].join(","),
  );
}

function isTextElement(el: Element | null) {
  if (!el) return false;
  if (el.closest("input, textarea, [contenteditable='true']")) return true;
  return !!el.closest(
    [
      ".profile-page__identity",
      ".profile-section",
      ".dev-stories__header",
      ".dev-story",
      ".focus-overview",
      ".focus-story",
    ].join(","),
  );
}

function canScrollElement(el: Element, deltaX: number, deltaY: number) {
  const target = el as HTMLElement;
  const canScrollY = target.scrollHeight > target.clientHeight + 1;
  const canScrollX = target.scrollWidth > target.clientWidth + 1;

  if (Math.abs(deltaY) >= Math.abs(deltaX) && canScrollY) {
    if (deltaY < 0) return target.scrollTop > 0;
    if (deltaY > 0) return target.scrollTop + target.clientHeight < target.scrollHeight - 1;
  }

  if (canScrollX) {
    if (deltaX < 0) return target.scrollLeft > 0;
    if (deltaX > 0) return target.scrollLeft + target.clientWidth < target.scrollWidth - 1;
  }

  return false;
}

function findUsefulScrollable(start: Element | null, deltaX: number, deltaY: number) {
  let el: Element | null = start;
  while (el && el !== document.documentElement) {
    if (el.closest("[data-cursor='drag-model']")) return null;
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const scrollableStyle =
      overflowY === "auto" ||
      overflowY === "scroll" ||
      overflowX === "auto" ||
      overflowX === "scroll";
    if (scrollableStyle && canScrollElement(el, deltaX, deltaY)) return el;
    el = el.parentElement;
  }
  return null;
}

function findWheelScrollable(e: WheelEvent) {
  const target = e.target instanceof Element ? e.target : null;
  const pointTarget = document.elementFromPoint(e.clientX, e.clientY);
  const direct = findUsefulScrollable(target, e.deltaX, e.deltaY) ?? findUsefulScrollable(pointTarget, e.deltaX, e.deltaY);
  if (direct) return direct;

  const overlayLayer = (target ?? pointTarget)?.closest(".overlay-layer");
  if (overlayLayer && canScrollElement(overlayLayer, e.deltaX, e.deltaY)) return overlayLayer;

  return null;
}

export function SpaceCursorOverlay({
  enabled,
  entered,
  overlayOpen,
  focusOpen,
}: {
  enabled: boolean;
  entered: boolean;
  overlayOpen: boolean;
  focusOpen: boolean;
}) {
  const [pos, setPos] = useState(() => ({
    x: typeof window === "undefined" ? 0 : window.innerWidth / 2,
    y: typeof window === "undefined" ? 0 : window.innerHeight / 2,
  }));
  const [mode, setMode] = useState<CursorMode>("default");
  const [pointerLocked, setPointerLocked] = useState(false);
  const [returning, setReturning] = useState(false);
  const [syncingToSystem, setSyncingToSystem] = useState(false);
  const [clickPulseNonce, setClickPulseNonce] = useState(0);
  const [scrollBursts, setScrollBursts] = useState<ScrollBurst[]>([]);

  const altHeldRef = useRef(false);
  const overlayOpenRef = useRef(overlayOpen);
  const focusOpenRef = useRef(focusOpen);
  const enteredRef = useRef(entered);
  const returnTimerRef = useRef<number | null>(null);
  const returnCompleteRef = useRef<(() => void) | null>(null);
  const syncTimerRef = useRef<number | null>(null);
  const unlockSyncPendingRef = useRef(false);
  const wasPointerLockedRef = useRef(false);
  const scrollIdRef = useRef(0);
  const scrollThrottleRef = useRef(0);

  useEffect(() => {
    overlayOpenRef.current = overlayOpen;
  }, [overlayOpen]);

  useEffect(() => {
    focusOpenRef.current = focusOpen;
  }, [focusOpen]);

  useEffect(() => {
    enteredRef.current = entered;
  }, [entered]);

  useEffect(() => {
    if (!enabled) return;
    document.body.classList.add("space-custom-cursor-enabled");
    return () => document.body.classList.remove("space-custom-cursor-enabled");
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const update = () => {
      const locked = document.pointerLockElement !== null;
      setPointerLocked(locked);
      if (locked) {
        setMode("default");
        wasPointerLockedRef.current = true;
        unlockSyncPendingRef.current = false;
        setSyncingToSystem(false);
        return;
      }
      if (wasPointerLockedRef.current) {
        wasPointerLockedRef.current = false;
        unlockSyncPendingRef.current = true;
        setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      }
    };
    update();
    document.addEventListener("pointerlockchange", update);
    return () => document.removeEventListener("pointerlockchange", update);
  }, [enabled]);

  const requestReturn = useCallback((onComplete: () => void) => {
    if (returnTimerRef.current !== null) {
      window.clearTimeout(returnTimerRef.current);
      returnTimerRef.current = null;
    }
    returnCompleteRef.current = onComplete;
    setReturning(true);
    setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    returnTimerRef.current = window.setTimeout(() => {
      returnTimerRef.current = null;
      setReturning(false);
      const complete = returnCompleteRef.current;
      returnCompleteRef.current = null;
      complete?.();
    }, RETURN_MS);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setSpaceCursorReturnHandler(requestReturn);
    return () => {
      setSpaceCursorReturnHandler(null);
      if (returnTimerRef.current !== null) window.clearTimeout(returnTimerRef.current);
      if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
    };
  }, [enabled, requestReturn]);

  useEffect(() => {
    if (!enabled) return;
    const onPointerMove = (e: PointerEvent) => {
      if (returning || document.pointerLockElement) return;
      if (unlockSyncPendingRef.current) {
        unlockSyncPendingRef.current = false;
        if (syncTimerRef.current !== null) window.clearTimeout(syncTimerRef.current);
        setSyncingToSystem(true);
        requestAnimationFrame(() => setPos({ x: e.clientX, y: e.clientY }));
        syncTimerRef.current = window.setTimeout(() => {
          syncTimerRef.current = null;
          setSyncingToSystem(false);
        }, RETURN_MS);
      } else if (!syncingToSystem) {
        setPos({ x: e.clientX, y: e.clientY });
      }
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("[data-cursor='drag-model']")) {
        setMode((current) => (current === "dragging" ? current : "dragReady"));
      } else if (isInteractiveElement(target)) {
        setMode("hover");
      } else if (isTextElement(target)) {
        setMode("text");
      } else {
        setMode("default");
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (document.pointerLockElement || returning) return;
      setClickPulseNonce((n) => n + 1);
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("[data-cursor='drag-model']")) setMode("dragging");
    };

    const onPointerUp = (e: PointerEvent) => {
      if (returning) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("[data-cursor='drag-model']")) setMode("dragReady");
      else if (isInteractiveElement(target)) setMode("hover");
      else if (isTextElement(target)) setMode("text");
      else setMode("default");
    };

    const onWheel = (e: WheelEvent) => {
      if (document.pointerLockElement || returning) return;
      if (!findWheelScrollable(e)) return;
      const now = performance.now();
      if (now - scrollThrottleRef.current < 90) return;
      scrollThrottleRef.current = now;
      const direction: ScrollBurst["direction"] = e.deltaY < 0 ? "up" : "down";
      const id = ++scrollIdRef.current;
      setScrollBursts((prev) => [...prev, { id, direction }].slice(-MAX_SCROLL_BURSTS));
      window.setTimeout(() => {
        setScrollBursts((prev) => prev.filter((burst) => burst.id !== id));
      }, SCROLL_PARTICLE_MS + 80);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerUp, true);
      window.removeEventListener("wheel", onWheel);
    };
  }, [enabled, returning, syncingToSystem]);

  useEffect(() => {
    if (!enabled) return;
    const isAltKey = (e: KeyboardEvent) => e.code === "AltLeft" || e.code === "AltRight" || e.key === "Alt";

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isAltKey(e)) return;
      if (!enteredRef.current || overlayOpenRef.current || focusOpenRef.current) return;
      e.preventDefault();
      if (altHeldRef.current) return;
      altHeldRef.current = true;
      releaseSpacePointerLock();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!isAltKey(e)) return;
      if (!altHeldRef.current) return;
      e.preventDefault();
      altHeldRef.current = false;
      if (!enteredRef.current || overlayOpenRef.current || focusOpenRef.current) return;
      requestReturn(() => resumeSpaceFirstPerson());
    };

    const onBlur = () => {
      altHeldRef.current = false;
      unlockSyncPendingRef.current = false;
      setSyncingToSystem(false);
      setMode("default");
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [enabled, requestReturn]);

  const visible = enabled && !pointerLocked;
  const style = useMemo(
    () =>
      ({
        "--space-cursor-x": `${pos.x}px`,
        "--space-cursor-y": `${pos.y}px`,
      }) as React.CSSProperties,
    [pos.x, pos.y],
  );

  if (!enabled) return null;

  return (
    <div
      aria-hidden
      className={`space-cursor-layer${visible ? " space-cursor-layer--visible" : ""}${entered ? "" : " space-cursor-layer--entry"}`}
      style={style}
    >
      <div
        key={clickPulseNonce}
        className={`space-cursor-dot space-cursor-dot--${mode}${returning ? " space-cursor-dot--returning" : ""}${syncingToSystem ? " space-cursor-dot--syncing" : ""}`}
      >
        <span className="space-cursor-clickPulse" />
        {scrollBursts.map((burst) => (
          <span
            key={burst.id}
            className={`space-cursor-scrollBurst space-cursor-scrollBurst--${burst.direction}`}
          >
            <i />
            <i />
            <i />
            <i />
          </span>
        ))}
      </div>
    </div>
  );
}
