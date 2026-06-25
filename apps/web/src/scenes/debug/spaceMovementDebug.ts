export const SPACE_MOVEMENT_DEBUG_EVENT = "space:movement-debug";
export const SPACE_RAYCAST_DEBUG_EVENT = "space:raycast-debug";
export const SPACE_EXHIBIT_PLACEMENT_DEBUG_EVENT = "space:exhibit-placement-debug";

export type SpaceMovementDebugSample = {
  timestamp: number;
  enabled: boolean;
  grounded: boolean;
  collisionCount: number;
  contactNames: string[];
  position: { x: number; y: number; z: number };
  desiredSpeed: number;
  actualSpeed: number;
  targetSpeed: number;
  speedRatio: number | null;
  verticalVelocity: number;
  dt: number;
};

export type SpaceRaycastDebugSample = {
  timestamp: number;
  hitMeshName: string | null;
};

export type SpaceExhibitPlacementDebugSample = {
  timestamp: number;
  exhibitId: string;
  anchorName: string;
  lod: string | null;
  floorName: string | null;
};

declare global {
  interface WindowEventMap {
    "space:movement-debug": CustomEvent<SpaceMovementDebugSample>;
    "space:raycast-debug": CustomEvent<SpaceRaycastDebugSample>;
    "space:exhibit-placement-debug": CustomEvent<SpaceExhibitPlacementDebugSample>;
  }
}

const colliderDebugNames = new Map<number, string>();

export function registerSpaceCollisionDebugCollider(
  collider: { handle: number } | null | undefined,
  name: string,
) {
  if (!import.meta.env.DEV || !collider) return () => {};

  const handle = collider.handle;
  colliderDebugNames.set(handle, name);
  return () => {
    if (colliderDebugNames.get(handle) === name) {
      colliderDebugNames.delete(handle);
    }
  };
}

export function resolveSpaceCollisionDebugName(collider: { handle: number } | null | undefined) {
  if (!collider) return null;
  return colliderDebugNames.get(collider.handle) ?? `unknown#${collider.handle}`;
}

export function publishSpaceMovementDebug(sample: SpaceMovementDebugSample) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SPACE_MOVEMENT_DEBUG_EVENT, { detail: sample }));
}

export function publishSpaceRaycastDebug(sample: SpaceRaycastDebugSample) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SPACE_RAYCAST_DEBUG_EVENT, { detail: sample }));
}

export function publishSpaceExhibitPlacementDebug(sample: SpaceExhibitPlacementDebugSample) {
  if (!import.meta.env.DEV || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SPACE_EXHIBIT_PLACEMENT_DEBUG_EVENT, { detail: sample }));
}
