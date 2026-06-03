import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { GALLERY_SAFETY_GROUND_Y, GALLERY_SPAWN } from "./galleryConfig";

type GallerySpawnContextValue = {
  spawn: [number, number, number];
  setSpawn: (spawn: [number, number, number]) => void;
  safetyGroundY: number;
  setSafetyGroundY: (y: number) => void;
  safetyCenterX: number;
  safetyCenterZ: number;
  setSafetyCenter: (x: number, z: number) => void;
};

const GallerySpawnContext = createContext<GallerySpawnContextValue | null>(null);

export function GallerySpawnProvider({ children }: { children: ReactNode }) {
  const [spawn, setSpawn] = useState<[number, number, number]>(GALLERY_SPAWN);
  const [safetyGroundY, setSafetyGroundY] = useState(GALLERY_SAFETY_GROUND_Y);
  const [safetyCenterX, setSafetyCenterX] = useState(0);
  const [safetyCenterZ, setSafetyCenterZ] = useState(0);

  const setSafetyCenter = useCallback((x: number, z: number) => {
    setSafetyCenterX(x);
    setSafetyCenterZ(z);
  }, []);

  const value = useMemo(
    () => ({
      spawn,
      setSpawn,
      safetyGroundY,
      setSafetyGroundY,
      safetyCenterX,
      safetyCenterZ,
      setSafetyCenter,
    }),
    [spawn, safetyGroundY, safetyCenterX, safetyCenterZ, setSafetyCenter],
  );

  return <GallerySpawnContext.Provider value={value}>{children}</GallerySpawnContext.Provider>;
}

export function useGallerySpawn() {
  const ctx = useContext(GallerySpawnContext);
  if (!ctx) throw new Error("useGallerySpawn must be used within GallerySpawnProvider");
  return ctx;
}
