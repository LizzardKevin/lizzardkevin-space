import { useEffect, useRef, type RefObject } from "react";
import {
  START_LOBBY_INTRO_ASSEMBLED_CLOCK_S,
  START_LOBBY_INTRO_SETTLE_HOLD_MS,
  START_LOBBY_INTRO_TOTAL_MS,
  resolveLobbyIntroWipe,
  type LobbyShatterClock,
} from "./startLobbyIntroShatter.ts";

const INTRO_READY_FALLBACK_MS = 900;
const INTRO_EXIT_FALLBACK_MS = 900;

/** StartLobby 的 R3F store 的最小结构:intro 只需要每帧 invalidate。 */
export type StartLobbyIntroStore = Readonly<{
  getState(): { invalidate(): void };
}>;

export type StartLobbyIntroProps = {
  /** 3D 标题几何已挂载(字体加载完成);超时未到也会兜底开播。 */
  ready: boolean;
  /** 共享 shatter 时钟(秒):0=完全炸开,≥ 终态=完整聚合。 */
  clockRef: RefObject<LobbyShatterClock>;
  storeRef: RefObject<StartLobbyIntroStore | null>;
  onSettled(): void;
  onExited(): void;
};

export function StartLobbyIntro({ ready, clockRef, storeRef, onSettled, onExited }: StartLobbyIntroProps) {
  const wipeRef = useRef<HTMLDivElement>(null);
  const settledRef = useRef(false);
  const callbacksRef = useRef({ onSettled, onExited });
  const controlsRef = useRef<{ setReady(): void } | null>(null);

  useEffect(() => {
    callbacksRef.current = { onSettled, onExited };
  }, [onSettled, onExited]);

  useEffect(() => {
    const wipeElement = wipeRef.current;
    if (!wipeElement) return undefined;
    const wipe: HTMLDivElement = wipeElement;

    let destroyed = false;
    let started = false;
    let rafId: number | null = null;
    let startAtMs: number | null = null;
    let hiddenAtMs: number | null = null;
    let exitTimerId: number | null = null;
    let fallbackTimerId: number | null = null;
    const clock = clockRef.current;

    function invalidateScene() {
      storeRef.current?.getState().invalidate();
    }

    function paintWipe(elapsedMs: number) {
      const state = resolveLobbyIntroWipe(elapsedMs);
      wipe.style.opacity = String(state.opacity);
    }

    // 每帧推进共享时钟并 invalidate:demand 渲染的 R3F 标题因此连续重绘,
    // 碎片位移/自旋/淡入全部在 GPU 由 uShatterClock 驱动,CPU 不改任何 attribute。
    function paintScene(elapsedMs: number) {
      clock.value = elapsedMs / 1000;
      invalidateScene();
      paintWipe(elapsedMs);
    }

    function settle() {
      if (settledRef.current) return;
      settledRef.current = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (fallbackTimerId !== null) {
        window.clearTimeout(fallbackTimerId);
        fallbackTimerId = null;
      }
      paintScene(START_LOBBY_INTRO_TOTAL_MS);
      callbacksRef.current.onSettled();
      exitTimerId = window.setTimeout(() => callbacksRef.current.onExited(), INTRO_EXIT_FALLBACK_MS);
    }

    function onAnimationFrame(nowMs: number) {
      rafId = null;
      if (destroyed || startAtMs === null) return;
      const elapsedMs = nowMs - startAtMs;
      if (elapsedMs >= START_LOBBY_INTRO_TOTAL_MS + START_LOBBY_INTRO_SETTLE_HOLD_MS) {
        settle();
        return;
      }
      paintScene(elapsedMs);
      rafId = requestAnimationFrame(onAnimationFrame);
    }

    function start() {
      if (destroyed || started || settledRef.current) return;
      started = true;
      if (fallbackTimerId !== null) {
        window.clearTimeout(fallbackTimerId);
        fallbackTimerId = null;
      }
      startAtMs = performance.now();
      paintScene(0);
      rafId = requestAnimationFrame(onAnimationFrame);
    }

    function onVisibilityChange() {
      if (destroyed || startAtMs === null || settledRef.current) return;
      if (document.visibilityState === "hidden") {
        hiddenAtMs = performance.now();
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else if (hiddenAtMs !== null) {
        startAtMs += performance.now() - hiddenAtMs;
        hiddenAtMs = null;
        rafId ??= requestAnimationFrame(onAnimationFrame);
      }
    }

    controlsRef.current = { setReady: start };
    fallbackTimerId = window.setTimeout(start, INTRO_READY_FALLBACK_MS);

    paintWipe(0);

    window.addEventListener("pointerdown", settle, { capture: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      destroyed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (exitTimerId !== null) window.clearTimeout(exitTimerId);
      if (fallbackTimerId !== null) window.clearTimeout(fallbackTimerId);
      window.removeEventListener("pointerdown", settle, { capture: true });
      document.removeEventListener("visibilitychange", onVisibilityChange);
      controlsRef.current = null;
      // 中途卸载(dispose/严格模式重挂载)时把标题定格在完整态,避免残留半成品。
      if (!settledRef.current) {
        clock.value = START_LOBBY_INTRO_ASSEMBLED_CLOCK_S;
        invalidateScene();
      }
    };
  }, [clockRef, storeRef]);

  useEffect(() => {
    if (ready) controlsRef.current?.setReady();
  }, [ready]);

  return (
    <div
      className="start-lobby__intro"
      aria-hidden="true"
      onTransitionEnd={(event) => {
        if (event.propertyName !== "opacity" || !settledRef.current) return;
        callbacksRef.current.onExited();
      }}
    >
      <div ref={wipeRef} className="start-lobby__intro-wipe" />
    </div>
  );
}
