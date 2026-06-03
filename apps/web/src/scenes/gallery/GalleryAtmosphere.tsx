import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import * as THREE from "three";
import { GALLERY_TOON } from "./galleryConfig";

/** Scene fog + background tuned for Firewatch-style depth read without GTAO. */
export function GalleryAtmosphere() {
  const scene = useThree((state) => state.scene);

  useLayoutEffect(() => {
    const prevBackground = scene.background;
    const prevFog = scene.fog;

    scene.background = new THREE.Color(GALLERY_TOON.background);
    scene.fog = GALLERY_TOON.useExponentialFog
      ? new THREE.FogExp2(GALLERY_TOON.fogColor, GALLERY_TOON.fogDensity)
      : new THREE.Fog(GALLERY_TOON.fogColor, GALLERY_TOON.fogNear, GALLERY_TOON.fogFar);

    return () => {
      scene.background = prevBackground;
      scene.fog = prevFog;
    };
  }, [scene]);

  return null;
}
