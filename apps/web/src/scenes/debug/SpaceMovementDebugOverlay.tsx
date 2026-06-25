import { useEffect, useRef, useState } from "react";
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

  const contacts = sample.contactNames.length > 0 ? sample.contactNames.join(", ") : "none";
  const hitMeshName = raycastSample?.hitMeshName ?? "none";
  const exhibitPlacement = placementSample
    ? `${placementSample.exhibitId} / ${placementSample.anchorName} / ${placementSample.lod ?? "none"} / ${
        placementSample.floorName ?? "no floor"
      }`
    : "none";

  return (
    <aside className="space-movement-debug" aria-label="SPACE debug">
      <div className="space-movement-debug__title">debug</div>
      <dl>
        <div>
          <dt>mesh</dt>
          <dd>{hitMeshName}</dd>
        </div>
        <div>
          <dt>exhibit</dt>
          <dd>{exhibitPlacement}</dd>
        </div>
        <div>
          <dt>pos</dt>
          <dd>
            x {formatNumber(sample.position.x)} / y {formatNumber(sample.position.y)} / z{" "}
            {formatNumber(sample.position.z)}
          </dd>
        </div>
        <div>
          <dt>speed</dt>
          <dd>
            actual {formatNumber(sample.actualSpeed)} m/s / desired{" "}
            {formatNumber(sample.desiredSpeed)} m/s
          </dd>
        </div>
        <div>
          <dt>ratio</dt>
          <dd>
            {formatSpeedRatio(sample.speedRatio)} / target {formatNumber(sample.targetSpeed)} m/s
          </dd>
        </div>
        <div>
          <dt>state</dt>
          <dd>
            grounded {sample.grounded ? "yes" : "no"} / collisions {sample.collisionCount}
          </dd>
        </div>
        <div>
          <dt>vertical</dt>
          <dd>{formatNumber(sample.verticalVelocity)} m/s</dd>
        </div>
        <div>
          <dt>contact</dt>
          <dd>{contacts}</dd>
        </div>
      </dl>
    </aside>
  );
}
