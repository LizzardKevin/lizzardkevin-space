import { createContext } from "react";

export type GallerySpawnContextValue = {
  spawn: [number, number, number];
  setSpawn: (spawn: [number, number, number]) => void;
  safetyGroundY: number;
  setSafetyGroundY: (y: number) => void;
  safetyCenterX: number;
  safetyCenterZ: number;
  setSafetyCenter: (x: number, z: number) => void;
};

export const GallerySpawnContext = createContext<GallerySpawnContextValue | null>(null);
