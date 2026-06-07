import { useCallback, useMemo, useState, type ReactNode } from "react";
import { GALLERY_SAFETY_GROUND_Y, GALLERY_SPAWN } from "./galleryConfig";
import { GallerySpawnContext } from "./GallerySpawnContext";

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
