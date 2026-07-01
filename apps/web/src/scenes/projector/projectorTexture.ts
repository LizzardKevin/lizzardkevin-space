import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

function configureProjectorTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.x = -1;
  texture.offset.x = 1;
  texture.needsUpdate = true;
}

export function useProjectorImageTexture(imageUrl: string) {
  const sourceTexture = useTexture(imageUrl);
  const texture = useMemo(() => sourceTexture.clone(), [sourceTexture]);

  useEffect(() => {
    configureProjectorTexture(texture);
    return () => texture.dispose();
  }, [texture]);

  return texture;
}

export function preloadProjectorImageTexture(imageUrl: string) {
  useTexture.preload(imageUrl);
}
