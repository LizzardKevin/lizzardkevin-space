import { CuboidCollider, RigidBody, type RapierCollider } from "@react-three/rapier";
import { useEffect, useRef } from "react";
import { registerSpaceCollisionDebugCollider } from "../debug/spaceMovementDebug";
import { GALLERY_SAFETY_GROUND_Y } from "./galleryConfig";

/** Large invisible collider below the gallery so the player never falls forever. */
export function SafetyGround({
  y = GALLERY_SAFETY_GROUND_Y,
  centerX = 0,
  centerZ = 0,
}: {
  y?: number;
  centerX?: number;
  centerZ?: number;
}) {
  const colliderRef = useRef<RapierCollider>(null);

  useEffect(() => {
    return registerSpaceCollisionDebugCollider(colliderRef.current, "SAFETY_GROUND");
  }, []);

  return (
    <RigidBody type="fixed" colliders={false} friction={1}>
      <CuboidCollider
        ref={colliderRef}
        name="SAFETY_GROUND"
        args={[2000, 0.25, 2000]}
        position={[centerX, y, centerZ]}
      />
    </RigidBody>
  );
}
