import { useTranslation } from "react-i18next";
import type { EntryTransition } from "../entry/entryTypes";

export function MobileExperience({ entry }: { entry: EntryTransition }) {
  const { t } = useTranslation();
  const { entered, fading } = entry;
  const entryPhase = !entered;
  const revealing = fading || entered;

  return (
    <div
      className={`mobile-entry-panel${entryPhase ? " mobile-entry-panel--entry" : ""}${revealing ? " mobile-entry-panel--revealed" : ""}`}
    >
      <p className="mobile-entry-message">{t("mobile.underConstruction")}</p>
    </div>
  );
}
