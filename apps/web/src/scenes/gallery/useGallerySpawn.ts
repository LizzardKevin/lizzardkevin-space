import { useContext } from "react";
import { GallerySpawnContext } from "./GallerySpawnContext";

export function useGallerySpawn() {
  const ctx = useContext(GallerySpawnContext);
  if (!ctx) throw new Error("useGallerySpawn must be used within GallerySpawnProvider");
  return ctx;
}
