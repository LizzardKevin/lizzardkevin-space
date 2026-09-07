import { useContext, useLayoutEffect, useRef } from "react";
import { AsciiContext } from "./asciiContext";
import { ASCII_ENTER_SECONDS, ASCII_EXIT_SECONDS, cipherFrame } from "./asciiTransition";
import { prefersReducedMotion } from "./useLenisScroll";
import "../styles/ascii-text.css";

/** Real text never mutates. The cipher is an unselectable, aria-hidden decoration. */
export function AsciiText({ text }: { text: string }) {
  const root = useRef<HTMLSpanElement>(null), decoration = useRef<HTMLSpanElement>(null);
  const { phase, epoch } = useContext(AsciiContext);
  useLayoutEffect(() => {
    const el = root.current, overlay = decoration.current;
    if (!el || !overlay) return;
    let raf = 0, observer: IntersectionObserver | null = null, started = false;
    const settle = () => { el.dataset.cipherActive = phase === "hidden" || phase === "exit" ? "true" : "false"; overlay.textContent = ""; };
    if (prefersReducedMotion() || phase === "hidden") { settle(); return; }
    el.dataset.cipherActive = "true";
    let start = 0, lastTick = -1;
    const frame = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / ((phase === "exit" ? ASCII_EXIT_SECONDS : ASCII_ENTER_SECONDS) * 1000));
      const tick = Math.floor((now - start) / 40);
      if (tick !== lastTick || progress === 1) {
        const next = cipherFrame(text, progress, phase, tick);
        overlay.textContent = next.text; overlay.style.opacity = String(next.opacity); lastTick = tick;
      }
      if (progress < 1 && !document.hidden) raf = requestAnimationFrame(frame);
      else settle();
    };
    const play = () => { if (!started) { started = true; raf = requestAnimationFrame(frame); } };
    if (phase === "exit") {
      const box = el.getBoundingClientRect();
      if (box.bottom >= 0 && box.top <= innerHeight) play(); else settle();
    } else {
      observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { observer?.disconnect(); play(); } });
      observer.observe(el);
    }
    return () => { cancelAnimationFrame(raf); observer?.disconnect(); };
  }, [text, phase, epoch]);
  return <span className="ark-ascii" ref={root} data-cipher-active="true">
    <span className="ark-ascii__real">{text}</span>
    <span className="ark-ascii__cipher" ref={decoration} aria-hidden="true" />
  </span>;
}
