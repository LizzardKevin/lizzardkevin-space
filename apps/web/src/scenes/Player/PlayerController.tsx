import { useFrame, useThree } from "@react-three/fiber";
import {
  CapsuleCollider,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
  type RapierCollider,
} from "@react-three/rapier";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useKeyboard } from "../controls/useKeyboard";
import {
  EYE_OFFSET,
  PLAYER_CAPSULE_HALF_HEIGHT,
  PLAYER_CAPSULE_RADIUS,
} from "../gallery/resolveGallerySpawn";

type RigidBodyRef = React.ElementRef<typeof RigidBody>;

const WALK_SPEED = 2.45;
const SPRINT_SPEED = 3.85;
/** Higher = reaches target speed faster when starting / changing direction. */
const MOVE_ACCEL = 11;
/** Higher = stops faster when keys are released. */
const MOVE_DECEL = 15;

/** Smoothstep on the per-frame blend — softer ease-in/out at start and stop. */
function easedMoveBlend(raw: number) {
  const t = Math.min(Math.max(raw, 0), 1);
  return t * t * (3 - 2 * t);
}

export function PlayerController({
  enabled,
  spawn,
}: {
  enabled: boolean;
  spawn?: [number, number, number];
}) {
  const { camera } = useThree();
  const keys = useKeyboard();
  const { world } = useRapier();

  const rb = useRef<RigidBodyRef>(null);
  const colliderRef = useRef<RapierCollider>(null);
  const controllerRef = useRef<ReturnType<typeof world.createCharacterController> | null>(null);
  const dtRef = useRef(1 / 60);
  const bobPhase = useRef(0);
  const bobRef = useRef(0);
  const idlePhase = useRef(0);
  const idleRef = useRef(0);
  const enabledRef = useRef(enabled);
  const spawnKeyRef = useRef<string | null>(null);

  const tmp = useMemo(
    () => ({
      move: new THREE.Vector3(),
      forward: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      targetVel: new THREE.Vector3(),
      step: new THREE.Vector3(),
    }),
    [],
  );

  const verticalVelocity = useRef(0);
  const grounded = useRef(false);
  const horizontalVelocity = useRef(new THREE.Vector3());

  enabledRef.current = enabled;

  useEffect(() => {
    const controller = world.createCharacterController(0.01);
    controller.setSlideEnabled(true);
    controller.enableSnapToGround(0.35);
    controller.enableAutostep(0.35, 0.15, true);
    controller.setMaxSlopeClimbAngle((40 * Math.PI) / 180);
    controller.setMinSlopeSlideAngle((55 * Math.PI) / 180);
    controllerRef.current = controller;
    return () => {
      controllerRef.current = null;
    };
  }, [world]);

  useEffect(() => {
    const body = rb.current;
    if (!body || !spawn) return;
    const key = spawn.join(",");
    if (spawnKeyRef.current === key) return;
    spawnKeyRef.current = key;
    body.setTranslation({ x: spawn[0], y: spawn[1], z: spawn[2] }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    verticalVelocity.current = 0;
    horizontalVelocity.current.set(0, 0, 0);
    grounded.current = false;
    camera.position.set(spawn[0], spawn[1] + EYE_OFFSET, spawn[2]);
  }, [spawn, camera]);

  useFrame((_, dt) => {
    dtRef.current = Math.min(dt, 0.05);
    const body = rb.current;
    if (!body) return;

    const t = body.translation();
    if (!enabledRef.current) {
      camera.position.set(t.x, t.y + EYE_OFFSET, t.z);
      return;
    }

    camera.position.set(t.x, t.y + EYE_OFFSET + bobRef.current + idleRef.current, t.z);
  });

  useBeforePhysicsStep(() => {
    const body = rb.current;
    const controller = controllerRef.current;
    const collider = colliderRef.current;
    if (!body || !controller || !collider || !enabledRef.current) return;

    const dt = dtRef.current;
    const t = body.translation();

    camera.getWorldDirection(tmp.forward);
    tmp.forward.set(tmp.forward.x, 0, tmp.forward.z);
    if (tmp.forward.lengthSq() < 1e-6) tmp.forward.set(0, 0, -1);
    tmp.forward.normalize();
    tmp.right.copy(tmp.forward).cross(tmp.up).normalize();

    tmp.move.set(0, 0, 0);
    if (keys.KeyW) tmp.move.add(tmp.forward);
    if (keys.KeyS) tmp.move.sub(tmp.forward);
    if (keys.KeyD) tmp.move.add(tmp.right);
    if (keys.KeyA) tmp.move.sub(tmp.right);

    const isMoving = tmp.move.lengthSq() > 0;
    if (isMoving) tmp.move.normalize();

    const maxSpeed = keys.ShiftLeft || keys.ShiftRight ? SPRINT_SPEED : WALK_SPEED;
    if (isMoving) tmp.targetVel.copy(tmp.move).multiplyScalar(maxSpeed);
    else tmp.targetVel.set(0, 0, 0);

    const rate = isMoving ? MOVE_ACCEL : MOVE_DECEL;
    const blend = easedMoveBlend(1 - Math.exp(-rate * dt));
    horizontalVelocity.current.lerp(tmp.targetVel, blend);

    tmp.step.copy(horizontalVelocity.current).multiplyScalar(dt);
    const desiredHorizontal = tmp.step;

    const actualSpeed = horizontalVelocity.current.length();
    const isLocomoting = actualSpeed > 0.0025;

    const g = -9.81;
    verticalVelocity.current += g * dt;
    if (grounded.current && verticalVelocity.current < 0) verticalVelocity.current = 0;

    const desired = {
      x: desiredHorizontal.x,
      y: verticalVelocity.current * dt,
      z: desiredHorizontal.z,
    };

    controller.computeColliderMovement(collider, desired);
    const m = controller.computedMovement();
    grounded.current = controller.computedGrounded();

    if (grounded.current && desired.y < 0) verticalVelocity.current = 0;

    body.setNextKinematicTranslation({ x: t.x + m.x, y: t.y + m.y, z: t.z + m.z });

    const bobAmp = 0.018;
    const bobSpeed = 10;
    // Scale bob by horizontal speed so stop deceleration fades bob smoothly (no sin jitter).
    const bobBlend = Math.min(actualSpeed / WALK_SPEED, 1);
    if (isLocomoting && grounded.current && bobBlend > 0.02) {
      bobPhase.current += bobSpeed * dt;
      bobRef.current = Math.sin(bobPhase.current) * bobAmp * bobBlend;
    } else {
      bobRef.current = THREE.MathUtils.lerp(bobRef.current, 0, blend);
      if (Math.abs(bobRef.current) < 1e-4) {
        bobRef.current = 0;
        bobPhase.current = 0;
      }
    }

    // Idle camera drift: only when not moving (subtle, natural).
    // Uses a slow multi-sine to avoid jitter and keeps amplitude tiny.
    if (!isLocomoting && grounded.current) {
      idlePhase.current += dt;
      const s =
        Math.sin(idlePhase.current * 0.9) * 0.6 +
        Math.sin(idlePhase.current * 1.7 + 1.3) * 0.3 +
        Math.sin(idlePhase.current * 2.3 + 2.4) * 0.1;
      const target = s * 0.007; // meters (slightly stronger idle drift)
      idleRef.current = THREE.MathUtils.lerp(idleRef.current, target, 0.12);
    } else {
      idleRef.current = THREE.MathUtils.lerp(idleRef.current, 0, blend);
    }
  });

  return (
    <RigidBody
      ref={rb}
      type="kinematicPosition"
      position={spawn ?? [0, 1, 6]}
      colliders={false}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider ref={colliderRef} args={[PLAYER_CAPSULE_HALF_HEIGHT, PLAYER_CAPSULE_RADIUS]} />
    </RigidBody>
  );
}
