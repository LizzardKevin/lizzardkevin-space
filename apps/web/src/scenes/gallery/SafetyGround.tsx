import { CuboidCollider, RigidBody } from "@react-three/rapier";
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
  return (
    <RigidBody type="fixed" colliders={false} friction={1}>
      <CuboidCollider args={[2000, 0.25, 2000]} position={[centerX, y, centerZ]} />
    </RigidBody>
  );
}
