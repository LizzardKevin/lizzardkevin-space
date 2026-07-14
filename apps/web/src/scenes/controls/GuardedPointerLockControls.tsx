import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  POINTER_LOCK_MOUSE_SENSITIVITY,
  POINTER_LOCK_WARMUP_MOVES,
  publishGuardedPointerLockDebugSample,
  requestPointerLockWithRawFallback,
  resolveGuardedPointerDelta,
} from "./guardedPointerLock";
import {
  isSpacePointerLockActive,
  resolveSpacePointerLockTarget,
} from "../../space/spacePointerLockTarget";

const HALF_PI = Math.PI / 2;

export function GuardedPointerLockControls({
  enabled = true,
  selector,
  pointerSpeed = 1,
  minPolarAngle = 0,
  maxPolarAngle = Math.PI,
}: {
  enabled?: boolean;
  selector?: string;
  pointerSpeed?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
}) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const get = useThree((state) => state.get);
  const setEvents = useThree((state) => state.setEvents);
  const invalidate = useThree((state) => state.invalidate);

  const euler = useMemo(() => new THREE.Euler(0, 0, 0, "YXZ"), []);
  const lockElement = resolveSpacePointerLockTarget(gl.domElement) ?? gl.domElement;
  const warmupMovesRef = useRef(POINTER_LOCK_WARMUP_MOVES);
  const enabledRef = useRef(enabled);

  useLayoutEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const oldCompute = get().events.compute;
    setEvents({
      compute(_event, state) {
        const offsetX = state.size.width / 2;
        const offsetY = state.size.height / 2;
        state.pointer.set((offsetX / state.size.width) * 2 - 1, -((offsetY / state.size.height) * 2 - 1));
        state.raycaster.setFromCamera(state.pointer, state.camera);
      },
    });

    return () => setEvents({ compute: oldCompute });
  }, [enabled, get, setEvents]);

  useEffect(() => {
    const onPointerLockChange = () => {
      warmupMovesRef.current = POINTER_LOCK_WARMUP_MOVES;
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!enabledRef.current) return;
      if (!isSpacePointerLockActive(lockElement)) return;

      const delta = resolveGuardedPointerDelta({
        movementX: event.movementX,
        movementY: event.movementY,
        skip: warmupMovesRef.current > 0,
      });
      if (warmupMovesRef.current > 0) warmupMovesRef.current -= 1;
      publishGuardedPointerLockDebugSample({
        timestamp: performance.now(),
        rawMovementX: event.movementX,
        rawMovementY: event.movementY,
        appliedMovementX: delta.movementX,
        appliedMovementY: delta.movementY,
        dropped: delta.dropped,
        reason: delta.reason,
      });
      if (delta.dropped) return;

      euler.setFromQuaternion(camera.quaternion);
      euler.y -= delta.movementX * POINTER_LOCK_MOUSE_SENSITIVITY * pointerSpeed;
      euler.x -= delta.movementY * POINTER_LOCK_MOUSE_SENSITIVITY * pointerSpeed;
      euler.x = Math.max(HALF_PI - maxPolarAngle, Math.min(HALF_PI - minPolarAngle, euler.x));
      camera.quaternion.setFromEuler(euler);
      invalidate();
    };

    const lock = () => {
      if (!enabledRef.current) return;
      requestPointerLockWithRawFallback(lockElement);
    };
    const elements = selector ? Array.from(document.querySelectorAll(selector)) : [lockElement];

    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("mousemove", onMouseMove);
    elements.forEach((element) => element.addEventListener("click", lock));

    return () => {
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("mousemove", onMouseMove);
      elements.forEach((element) => element.removeEventListener("click", lock));
    };
  }, [
    camera,
    euler,
    invalidate,
    lockElement,
    maxPolarAngle,
    minPolarAngle,
    pointerSpeed,
    selector,
  ]);

  return null;
}
