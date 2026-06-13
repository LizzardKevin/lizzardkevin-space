import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { EntryTransition } from "../../entry/entryTypes";

const PROMPT_SCALE_STEP = 0.035;
const EASTER_EGG_CLICK_THRESHOLD = 20;
const EASTER_EGG_LARGE_BUTTON_CLICK_THRESHOLD = 100;
const EASTER_EGG_VISIBLE_MS = 5000;

export function EntrySplash({
  entry,
  onEnter,
}: {
  entry: Pick<EntryTransition, "fading" | "hideButton" | "enterWrapRef" | "onSplashTransitionEnd">;
  onEnter: () => void;
}) {
  const { t } = useTranslation();
  const { fading, hideButton, enterWrapRef, onSplashTransitionEnd } = entry;
  const [pulseNonce, setPulseNonce] = useState(0);
  const [promptScale, setPromptScale] = useState(1);
  const [, setBlankClickCount] = useState(0);
  const [easterEggVisible, setEasterEggVisible] = useState(false);
  const [easterEggPos, setEasterEggPos] = useState({ x: 0, y: 0 });
  const easterEggTimerRef = useRef<number | null>(null);

  const hideEasterEgg = useCallback(() => {
    setEasterEggVisible(false);
    easterEggTimerRef.current = null;
  }, []);

  const [easterEggMessage, setEasterEggMessage] = useState("");

  const showEasterEgg = useCallback(
    (message: string, x: number, y: number) => {
      setEasterEggMessage(message);
      setEasterEggPos({ x, y });
      setEasterEggVisible(true);
      if (easterEggTimerRef.current !== null) {
        window.clearTimeout(easterEggTimerRef.current);
      }
      easterEggTimerRef.current = window.setTimeout(hideEasterEgg, EASTER_EGG_VISIBLE_MS);
    },
    [hideEasterEgg],
  );

  const handleSplashClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      if (fading || hideButton) return;
      setPromptScale((scale) => scale + PROMPT_SCALE_STEP);
      setPulseNonce((n) => n + 1);
      setBlankClickCount((count) => {
        const next = count + 1;
        if (next === EASTER_EGG_CLICK_THRESHOLD) {
          showEasterEgg("这么着急吗，倒是点击文字呀", e.clientX, e.clientY);
        }
        if (next === EASTER_EGG_LARGE_BUTTON_CLICK_THRESHOLD) {
          showEasterEgg("按钮都这么大了还不点吗？", e.clientX, e.clientY);
        }
        return next;
      });
    },
    [fading, hideButton, showEasterEgg],
  );

  const handleSplashPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!easterEggVisible) return;
      setEasterEggPos({ x: e.clientX, y: e.clientY });
    },
    [easterEggVisible],
  );

  const handlePromptClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (fading || hideButton) return;
      onEnter();
    },
    [fading, hideButton, onEnter],
  );

  const handlePromptKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      if (fading || hideButton) return;
      onEnter();
    },
    [fading, hideButton, onEnter],
  );

  useEffect(() => {
    return () => {
      if (easterEggTimerRef.current !== null) {
        window.clearTimeout(easterEggTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`space-splash${fading ? " space-splash--fading" : ""}`}
      onClick={handleSplashClick}
      onPointerMove={handleSplashPointerMove}
      onTransitionEnd={onSplashTransitionEnd}
    >
      {easterEggVisible ? (
        <div
          className="space-splashEasterEgg"
          style={{
            transform: `translate3d(${easterEggPos.x}px, ${easterEggPos.y}px, 0) translate(-50%, calc(-100% - 14px))`,
          }}
        >
          {easterEggMessage}
        </div>
      ) : null}
      <div
        ref={enterWrapRef}
        role="button"
        tabIndex={hideButton ? -1 : 0}
        aria-label={t("space.enter")}
        className={`space-enterButtonWrap${hideButton ? " space-enterButtonWrap--hide" : ""}`}
        style={{ "--enter-prompt-scale": promptScale } as React.CSSProperties}
        onClick={handlePromptClick}
        onKeyDown={handlePromptKeyDown}
      >
        <div className="space-enterButtonFloat">
          <div className="space-splashSignal">
            <h1>LizzardKevin Space</h1>
          </div>
          <span className="space-enterButton">
            <span
              key={pulseNonce}
              className={pulseNonce > 0 ? "space-enterButtonText space-enterButtonText--pulse" : "space-enterButtonText"}
            >
              {t("space.enter")}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
