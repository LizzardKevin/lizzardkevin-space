import { Crosshair } from "../components/Crosshair";
import { Toast } from "../components/Toast";
import { SpaceCursorOverlay } from "../cursor/SpaceCursorOverlay";
import { PlaybackBar } from "../media/PlaybackBar";
import { WebGPUUnavailable } from "../rendering/WebGPUUnavailable";
import { SpaceMovementDebugOverlay } from "../scenes/debug/SpaceMovementDebugOverlay";
import { useTranslation } from "react-i18next";

type SpaceHudProps = {
  entered: boolean;
  overlayOpen: boolean;
  focusOpen: boolean;
  pointerLocked: boolean;
  isHovering: boolean;
  crosshairPulseNonce: number;
  jumpHintMessage: string;
  jumpHintVisible: boolean;
  projectorHintVisible: boolean;
  toastMessage: string | null;
  toastDurationMs: number;
  onToastDone: () => void;
  invalidFocusedRoute: boolean;
  onNavigateToSpace: () => void;
  rendererFailed: boolean;
  rendererLoading: boolean;
  loadedItems: number;
  totalItems: number;
  bootFailed: boolean;
  bootError: string | null;
  onRetryBoot: () => void;
};

function JumpHint({ message, visible }: { message: string; visible: boolean }) {
  if (!visible || !message) return null;
  return <div className="jump-hint">{message}</div>;
}

function ProjectorControlsHint({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <div className="projector-controls-hint" aria-hidden>
      <span>{t("space.projector.previous")}</span>
      <span>{t("space.projector.next")}</span>
    </div>
  );
}

function SpaceBootFailure({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "#050505",
        color: "rgba(255,255,255,0.92)",
        fontFamily: "system-ui",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <p>{error ?? t("space.rendererUnavailableBody")}</p>
        <button type="button" onClick={onRetry}>{t("space.retry")}</button>
      </div>
    </div>
  );
}

export function SpaceHud({
  entered,
  overlayOpen,
  focusOpen,
  pointerLocked,
  isHovering,
  crosshairPulseNonce,
  jumpHintMessage,
  jumpHintVisible,
  projectorHintVisible,
  toastMessage,
  toastDurationMs,
  onToastDone,
  invalidFocusedRoute,
  onNavigateToSpace,
  rendererFailed,
  rendererLoading,
  loadedItems,
  totalItems,
  bootFailed,
  bootError,
  onRetryBoot,
}: SpaceHudProps) {
  const { t } = useTranslation();
  return (
    <>
      <SpaceCursorOverlay
        enabled
        entered={entered}
        overlayOpen={overlayOpen}
        focusOpen={focusOpen}
      />
      <SpaceMovementDebugOverlay />
      <Toast message={toastMessage} durationMs={toastDurationMs} onDone={onToastDone} />
      <JumpHint message={jumpHintMessage} visible={jumpHintVisible} />
      <ProjectorControlsHint visible={projectorHintVisible} />
      {pointerLocked ? (
        <Crosshair isHovering={isHovering} pulseNonce={crosshairPulseNonce} />
      ) : null}
      <PlaybackBar elevated={focusOpen} />
      {invalidFocusedRoute ? (
        <main
          className="focus-overlay"
          data-work-route-not-found="true"
          role="main"
          style={{ display: "grid", placeItems: "center" }}
        >
          <button
            type="button"
            className="focus-return-button focus-return-button--visible"
            onClick={onNavigateToSpace}
          >
            {t("route.invalidWorkReturn")}
          </button>
        </main>
      ) : null}
      {rendererFailed ? <WebGPUUnavailable /> : null}
      {rendererLoading ? (
        <div
          role="status"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 25,
            display: "grid",
            placeItems: "center",
            background: "#050505",
            color: "rgba(255,255,255,0.75)",
            fontFamily: "system-ui",
            fontSize: 13,
            letterSpacing: "0.06em",
            pointerEvents: "none",
          }}
        >
          <span>
            {t("space.loading")}
            <span className="space-renderer-loading-indicator" aria-hidden>•••</span>
          </span>
          {totalItems > 0 ? <span>{loadedItems}/{totalItems}</span> : null}
        </div>
      ) : null}
      {bootFailed ? <SpaceBootFailure error={bootError} onRetry={onRetryBoot} /> : null}
    </>
  );
}
