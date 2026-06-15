import { useRef } from "react";
import * as THREE from "three";
import { useAudioDirector } from "../../audio/useAudioDirector";
import {
  FOOTSTEP_INTERVAL_SPRINT,
  FOOTSTEP_INTERVAL_WALK,
} from "../../audio/audioConfig";

const SPRINT_SPEED = 5.1;

/**
 * 根据水平位移在落地行走时触发脚步声。
 */
export function useFootsteps() {
  const audio = useAudioDirector();
  const lastPos = useRef(new THREE.Vector3());
  const distSinceStep = useRef(0);
  const primed = useRef(false);

  const onPhysicsStep = (
    position: THREE.Vector3,
    opts: { grounded: boolean; horizontalSpeed: number; sprinting: boolean },
  ) => {
    if (!audio.isUnlocked()) return;

    if (!primed.current) {
      lastPos.current.copy(position);
      primed.current = true;
      return;
    }

    const dx = position.x - lastPos.current.x;
    const dz = position.z - lastPos.current.z;
    lastPos.current.copy(position);

    if (!opts.grounded || opts.horizontalSpeed < 0.08) {
      distSinceStep.current = 0;
      return;
    }

    const interval = opts.sprinting ? FOOTSTEP_INTERVAL_SPRINT : FOOTSTEP_INTERVAL_WALK;
    distSinceStep.current += Math.hypot(dx, dz);

    while (distSinceStep.current >= interval) {
      distSinceStep.current -= interval;
      audio.playFootstep();
    }
  };

  return { onPhysicsStep };
}

export { SPRINT_SPEED };
