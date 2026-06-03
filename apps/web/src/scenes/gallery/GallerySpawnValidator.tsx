import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { useEffect, useRef } from "react";
import type { Object3D } from "three";
import { checkSpawnPoint, findClearSpawn } from "./resolveGallerySpawn";

/**
 * After physics starts, verify spawn is not embedded in COL_inner_* / COL_outer.
 * Re-resolves from the candidate grid if the capsule overlaps inner or outer bounds.
 */
export function GallerySpawnValidator({
  root,
  spawn,
  onRespawn,
}: {
  root: Object3D;
  spawn: [number, number, number];
  onRespawn: (next: [number, number, number]) => void;
}) {
  const { world } = useRapier();
  const checked = useRef(false);
  const attempts = useRef(0);

  useEffect(() => {
    checked.current = false;
    attempts.current = 0;
  }, [spawn, root]);

  useFrame(() => {
    if (checked.current || attempts.current > 4) return;
    if (world.bodies.len() < 2) return;

    const [x, y, z] = spawn;
    const result = checkSpawnPoint(root, x, y, z);

    if (result.ok) {
      checked.current = true;
      return;
    }

    attempts.current += 1;
    if (import.meta.env.DEV) {
      console.warn("[gallery spawn] overlap detected", {
        spawn: [x, y, z],
        innerHits: result.innerHits,
        overlapsOuter: result.overlapsOuter,
      });
    }

    const next = findClearSpawn(root);
    if (!next) {
      checked.current = true;
      return;
    }
    if (next[0] === x && next[1] === y && next[2] === z) {
      checked.current = true;
      return;
    }
    onRespawn(next);
  });

  return null;
}
