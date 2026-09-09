import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { loadParticleCache, particleCacheUrlFor } from "../../particles/particleCacheLoader.ts";
import { ParticlePointsRenderer } from "../../particles/ParticlePointsRenderer.ts";
import { ScrollTrigger } from "../../scroll/scrollGsap";
import { prefersReducedMotion } from "../../scroll/useLenisScroll";
import { WorkParticleSession } from "./WorkParticleSession";
import { particleDeadline } from "../../particles/particleDeadline";

/** A persistent canvas/renderer. Only the latest generation may commit a compiled layer. */
export function WorkParticleHost({ exhibitId, onReady, onError }: {
  exhibitId: string; onReady?: () => void; onError?: (message: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<WorkParticleSession | null>(null);
  const [bootEpoch, setBootEpoch] = useState(0);
  const callbacks = useRef({ exhibitId, onReady, onError });
  useLayoutEffect(() => { callbacks.current = { exhibitId, onReady, onError }; }, [exhibitId, onReady, onError]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // StrictMode may retire an async init after its replacement has started.
    // Separate DOM canvases prevent the retired WebGL context from losing the live one.
    const canvas = document.createElement("canvas");
    canvas.dataset.workParticleState = "pending";
    canvas.setAttribute("aria-hidden", "true");
    Object.assign(canvas.style, { width: "100%", height: "100%", display: "block" });
    host.appendChild(canvas);
    const renderer = new ParticlePointsRenderer();
    renderer.viewOffsetFactor = .33;
    renderer.reducedMotion = prefersReducedMotion();
    let disposed = false, running = false, hasFrame = false;
    let raf = 0, lastAt = 0;
    const trace = import.meta.env.DEV && new URLSearchParams(location.search).get("wpTrace") === "1";
    const perf = import.meta.env.DEV && new URLSearchParams(location.search).get("wpPerf") === "1";
    let perfFrames = 0, perfMs = 0;
    let morphTrigger: ScrollTrigger | null = null;
    const frame = (now: number) => {
      if (disposed) return;
      if (perf && lastAt) {
        perfFrames++; perfMs += now - lastAt;
        if (perfMs >= 2000) {
          console.info(`[wpPerf] avg frame ${(perfMs / perfFrames).toFixed(2)}ms (${perfFrames} frames / ${perfMs.toFixed(0)}ms)`);
          perfFrames = 0; perfMs = 0;
        }
      }
      renderer.update(lastAt ? Math.min((now - lastAt) / 1000, .05) : 0);
      if (trace) canvas.dataset.workParticleFrame = JSON.stringify({ at: now, ...renderer.getTransitionState() });
      lastAt = now;
      raf = requestAnimationFrame(frame);
    };
    const resume = () => {
      if (document.hidden || !hasFrame || disposed) {
        cancelAnimationFrame(raf); running = false; lastAt = 0;
        perfFrames = 0; perfMs = 0;
      } else if (!running) {
        running = true; lastAt = 0; raf = requestAnimationFrame(frame);
      }
    };
    const resize = () => renderer.resize(window.innerWidth, window.innerHeight, devicePixelRatio || 1);
    const pointer = (event: PointerEvent) => renderer.setCursor(
      event.clientX / window.innerWidth * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1,
    );
    const bindMorph = () => {
      morphTrigger?.kill(); morphTrigger = null;
      const scroller = document.querySelector<HTMLElement>(".ark-scroll");
      const anchor = document.getElementById("work-media") ?? scroller?.querySelector<HTMLElement>(".ark-footer");
      if (scroller && anchor) {
        const end = () => Math.max(anchor.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - scroller.clientHeight * .25, 1);
        renderer.setMorphProgress(scroller.scrollTop / end());
        morphTrigger = ScrollTrigger.create({
          trigger: anchor, scroller, start: 0, end, invalidateOnRefresh: true,
          onUpdate: self => renderer.setMorphProgress(self.progress),
        });
      }
    };
    const forcedProfile = import.meta.env.DEV && new URLSearchParams(location.search).get("wpBackend") === "webgl2" ? "simplified" : undefined;
    const initialized = particleDeadline(renderer.init(canvas, undefined, forcedProfile).then(() => { if (!disposed) resize(); }));
    const session = new WorkParticleSession(
      renderer, (id, signal) => loadParticleCache(particleCacheUrlFor(id), signal), initialized,
      (id, state, message) => {
        if (disposed || callbacks.current.exhibitId !== id) return;
        canvas.dataset.workParticleState = state;
        canvas.dataset.workParticleExhibit = id;
        if (state === "pending") { morphTrigger?.kill(); morphTrigger = null; }
        if (state === "ready") {
          hasFrame = true;
          bindMorph();
          if (prefersReducedMotion()) renderer.skipIntro();
          if (import.meta.env.DEV) {
            const query = new URLSearchParams(window.location.search);
            const intro = query.get("wpIntro");
            if (intro === "0") renderer.skipIntro();
            else if (intro !== null && Number.isFinite(Number(intro))) renderer.setIntroProgress(Number(intro));
            const morph = query.get("wpMorph");
            if (morph !== null && Number.isFinite(Number(morph))) {
              morphTrigger?.kill(); morphTrigger = null; renderer.setMorphProgress(Number(morph));
            }
            const px = Number.parseFloat(query.get("px") ?? ""), py = Number.parseFloat(query.get("py") ?? "");
            if (Number.isFinite(px) || Number.isFinite(py)) {
              renderer.setCursor(Number.isFinite(px) ? px : 0, Number.isFinite(py) ? py : 0);
              renderer.snapCursorToTarget();
            }
          }
          renderer.update(0);
          resume();
          callbacks.current.onReady?.();
        } else if (state === "failed") {
          if (renderer.unavailable) hasFrame = false;
          if (!hasFrame) teardown();
          callbacks.current.onError?.(message ?? "Particle field unavailable");
        }
      },
    );
    sessionRef.current = session;
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", pointer, { passive: true });
    const teardown = () => {
      if (disposed) return;
      disposed = true; session.dispose(); sessionRef.current = null;
      cancelAnimationFrame(raf); morphTrigger?.kill();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", pointer);
      renderer.dispose();
      canvas.remove();
    };
    return () => teardown();
  }, [bootEpoch]);

  useEffect(() => {
    if (sessionRef.current) sessionRef.current.request(exhibitId);
    else setBootEpoch(epoch => epoch + 1);
  }, [exhibitId, bootEpoch]);

  return <div ref={hostRef} aria-hidden="true" style={{
    position: "fixed", inset: 0, zIndex: -1, width: "100%", height: "100%",
    display: "block", pointerEvents: "none",
  }} />;
}
