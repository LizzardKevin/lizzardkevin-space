import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFocusDoubleClickHandler } from "../../exhibits/focusDoubleClick";

export function SpaceOnboardingFocusDemo({
  onBeginDismiss,
  onClose,
}: {
  onBeginDismiss: (opts?: { fromEscape?: boolean }) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [dimOn, setDimOn] = useState(false);
  const closingRef = useRef(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setVisible(true);
      setDimOn(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const requestClose = useCallback(
    (opts?: { fromEscape?: boolean }) => {
      if (closingRef.current) return;
      closingRef.current = true;
      onBeginDismiss(opts);
      setVisible(false);
      window.setTimeout(() => setDimOn(false), 120);
      window.setTimeout(() => onClose(), 420);
    },
    [onBeginDismiss, onClose],
  );

  const handleBlankDoubleClick = useCallback(() => {
    requestClose();
  }, [requestClose]);
  const handleBlankClick = useFocusDoubleClickHandler(handleBlankDoubleClick);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose({ fromEscape: true });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`space-onboarding-focus${visible ? " space-onboarding-focus--visible" : ""}${dimOn ? " space-onboarding-focus--dim" : ""}`}
      data-cursor-tone="light"
    >
      <button
        type="button"
        className={`focus-return-button${visible ? " focus-return-button--visible" : ""}`}
        aria-label={t("focus.returnLabel")}
        data-cursor="interactive"
        data-cursor-tone="light"
        onClick={() => requestClose()}
      >
        <span className="focus-return-button__prefix">{t("focus.returnPrefix")}</span>
        <span className="focus-return-button__space">space</span>
      </button>

      <button
        type="button"
        className="space-onboarding-focus__blank"
        aria-label={t("space.onboarding.focusExit")}
        onClick={handleBlankClick}
      >
        <span className="space-onboarding-focus__artifact" aria-hidden>
          <span className="space-onboarding-focus__eyebrow">FOCUS</span>
          <span className="space-onboarding-focus__title">{t("space.onboarding.focusTitle")}</span>
          <span className="space-onboarding-focus__body">{t("space.onboarding.focusBody")}</span>
        </span>
        <span className="space-onboarding-focus__exitHint">{t("space.onboarding.focusExit")}</span>
      </button>
    </div>
  );
}
