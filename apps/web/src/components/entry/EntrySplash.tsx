import { useTranslation } from "react-i18next";
import type { EntryTransition } from "../../entry/entryTypes";

export function EntrySplash({
  entry,
  onEnter,
}: {
  entry: Pick<EntryTransition, "fading" | "hideButton" | "enterWrapRef" | "onSplashTransitionEnd">;
  onEnter: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className={`space-splash${entry.fading ? " space-splash--fading" : ""}`}
      onTransitionEnd={entry.onSplashTransitionEnd}
    >
      <div
        ref={entry.enterWrapRef}
        className={`space-enterButtonWrap${entry.hideButton ? " space-enterButtonWrap--hide" : ""}`}
      >
        <button type="button" onClick={onEnter} className="space-enterButton">
          {t("space.enter")}
        </button>
      </div>
    </div>
  );
}
