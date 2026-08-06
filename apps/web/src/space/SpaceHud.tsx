import { Crosshair } from "../components/Crosshair";
import { Toast } from "../components/Toast";
import { SpaceCursorOverlay } from "../cursor/SpaceCursorOverlay";
import { PlaybackBar } from "../media/PlaybackBar";
import { WebGPUUnavailable } from "../rendering/WebGPUUnavailable";
import { SpaceMovementDebugOverlay } from "../scenes/debug/SpaceMovementDebugOverlay";
import { useTranslation } from "react-i18next";
import type { RefObject } from "react";
import { SpaceQuestHud } from "./quests/SpaceQuestHud";
import { SpaceMinimap } from "./minimap/SpaceMinimap";
import type { SpacePlayerPose } from "./spaceDailyResume";

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
  rendererFailed: boolean;
  rendererLoading: boolean;
  loadedItems: number;
  totalItems: number;
  bootFailed: boolean;
  bootError: string | null;
  onRetryBoot: () => void;
  poseRef: RefObject<SpacePlayerPose | null>;
  onboardingCompleted: boolean;
  routeBlocked: boolean;
  exhibitHint: { exhibitId: string; title: string; subtitle: string } | null;
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
    <div className="space-boot-failure" role="alert">
      <div className="space-boot-failure__content">
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
  rendererFailed,
  rendererLoading,
  loadedItems,
  totalItems,
  bootFailed,
  bootError,
  onRetryBoot,
  poseRef,
  onboardingCompleted,
  routeBlocked,
  exhibitHint,
}: SpaceHudProps) {
  const { t } = useTranslation();
  // 探索目标与全息地图:onboarding 结束、无遮盖层、路由未被接管时才展示。
  const widgetsVisible =
    entered &&
    !overlayOpen &&
    !focusOpen &&
    onboardingCompleted &&
    !routeBlocked &&
    !rendererFailed;
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
      <SpaceQuestHud visible={widgetsVisible} />
      <SpaceMinimap poseRef={poseRef} visible={widgetsVisible} />
      {pointerLocked ? (
        <Crosshair isHovering={isHovering} pulseNonce={crosshairPulseNonce} />
      ) : null}
      {pointerLocked && !focusOpen && exhibitHint ? (
        <div className="space-exhibit-hint" key={exhibitHint.exhibitId}>
          <span className="space-exhibit-hint__title">{exhibitHint.title}</span>
          {exhibitHint.subtitle ? (
            <span className="space-exhibit-hint__subtitle">{exhibitHint.subtitle}</span>
          ) : null}
        </div>
      ) : null}
      <PlaybackBar elevated={focusOpen} />
      {rendererFailed ? <WebGPUUnavailable /> : null}
      {rendererLoading ? (
        <div
          className="space-renderer-loading"
          role="status"
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
