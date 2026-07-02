import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  SPACE_EXHIBIT_PLACEMENT_DEBUG_EVENT,
  SPACE_MOVEMENT_DEBUG_EVENT,
  SPACE_RAYCAST_DEBUG_EVENT,
  type SpaceExhibitPlacementDebugSample,
  type SpaceMovementDebugSample,
  type SpaceRaycastDebugSample,
} from "./spaceMovementDebug";

function formatNumber(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

function formatSpeedRatio(value: number | null) {
  return value === null || !Number.isFinite(value) ? "n/a" : `${value.toFixed(2)}x`;
}

export function SpaceMovementDebugOverlay() {
  const { t } = useTranslation();
  const [sample, setSample] = useState<SpaceMovementDebugSample | null>(null);
  const [raycastSample, setRaycastSample] = useState<SpaceRaycastDebugSample | null>(null);
  const [placementSample, setPlacementSample] = useState<SpaceExhibitPlacementDebugSample | null>(
    null,
  );
  const lastRenderRef = useRef(0);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const onDebugSample = (event: WindowEventMap[typeof SPACE_MOVEMENT_DEBUG_EVENT]) => {
      const now = performance.now();
      if (now - lastRenderRef.current < 90) return;
      lastRenderRef.current = now;
      setSample(event.detail);
    };
    const onRaycastSample = (event: WindowEventMap[typeof SPACE_RAYCAST_DEBUG_EVENT]) => {
      setRaycastSample(event.detail);
    };
    const onPlacementSample = (
      event: WindowEventMap[typeof SPACE_EXHIBIT_PLACEMENT_DEBUG_EVENT],
    ) => {
      setPlacementSample(event.detail);
    };

    window.addEventListener(SPACE_MOVEMENT_DEBUG_EVENT, onDebugSample);
    window.addEventListener(SPACE_RAYCAST_DEBUG_EVENT, onRaycastSample);
    window.addEventListener(SPACE_EXHIBIT_PLACEMENT_DEBUG_EVENT, onPlacementSample);
    return () => {
      window.removeEventListener(SPACE_MOVEMENT_DEBUG_EVENT, onDebugSample);
      window.removeEventListener(SPACE_RAYCAST_DEBUG_EVENT, onRaycastSample);
      window.removeEventListener(SPACE_EXHIBIT_PLACEMENT_DEBUG_EVENT, onPlacementSample);
    };
  }, []);

  if (!import.meta.env.DEV || !sample) return null;

  const noneLabel = t("debug.none");
  const contacts = sample.contactNames.length > 0 ? sample.contactNames.join(", ") : noneLabel;
  const hitMeshName = raycastSample?.hitMeshName ?? noneLabel;
  const exhibitPlacement = placementSample
    ? `${placementSample.exhibitId} / ${placementSample.placementMode} / ${placementSample.variant} / ${
        placementSample.mounted ? t("debug.mounted") : t("debug.unmounted")
      } / ${
        placementSample.floorName ?? t("debug.noFloor")
      }`
    : noneLabel;

  return (
    <aside className="space-movement-debug" aria-label={t("debug.label")}>
      <div className="space-movement-debug__title">{t("debug.title")}</div>
      <dl>
        <div>
          <dt>{t("debug.mesh")}</dt>
          <dd>{hitMeshName}</dd>
        </div>
        <div>
          <dt>{t("debug.exhibit")}</dt>
          <dd>{exhibitPlacement}</dd>
        </div>
        <div>
          <dt>{t("debug.fps")}</dt>
          <dd>
            {formatNumber(sample.frameRate.fps, 1)} / {t("debug.frame")}{" "}
            {formatNumber(sample.frameRate.frameMs, 1)} ms
          </dd>
        </div>
        <div>
          <dt>{t("debug.position")}</dt>
          <dd>
            x {formatNumber(sample.position.x)} / y {formatNumber(sample.position.y)} / z{" "}
            {formatNumber(sample.position.z)}
          </dd>
        </div>
        <div>
          <dt>{t("debug.speed")}</dt>
          <dd>
            {t("debug.actual")} {formatNumber(sample.actualSpeed)} m/s / {t("debug.desired")}{" "}
            {formatNumber(sample.desiredSpeed)} m/s
          </dd>
        </div>
        <div>
          <dt>{t("debug.ratio")}</dt>
          <dd>
            {formatSpeedRatio(sample.speedRatio)} / {t("debug.target")}{" "}
            {formatNumber(sample.targetSpeed)} m/s
          </dd>
        </div>
        <div>
          <dt>{t("debug.look")}</dt>
          <dd>
            {t("debug.yaw")} {formatNumber(sample.lookRotation.yawDeg)} deg / {t("debug.pitch")}{" "}
            {formatNumber(sample.lookRotation.pitchDeg)} deg / {t("debug.tick")}{" "}
            {sample.lookRotation.tick}
          </dd>
        </div>
        <div>
          <dt>{t("debug.lookDelta")}</dt>
          <dd>
            {t("debug.yaw")} {formatNumber(sample.lookRotation.deltaYawDeg)} deg /{" "}
            {t("debug.pitch")} {formatNumber(sample.lookRotation.deltaPitchDeg)} deg /{" "}
            {t("debug.total")} {formatNumber(sample.lookRotation.deltaTotalDeg)} deg /{" "}
            {t("debug.dt")} {formatNumber(sample.dt * 1000)} ms
          </dd>
        </div>
        <div>
          <dt>{t("debug.state")}</dt>
          <dd>
            {t("debug.grounded")} {sample.grounded ? t("debug.yes") : t("debug.no")} /{" "}
            {t("debug.collisions")} {sample.collisionCount}
          </dd>
        </div>
        <div>
          <dt>{t("debug.vertical")}</dt>
          <dd>{formatNumber(sample.verticalVelocity)} m/s</dd>
        </div>
        <div>
          <dt>{t("debug.contact")}</dt>
          <dd>{contacts}</dd>
        </div>
      </dl>
    </aside>
  );
}
