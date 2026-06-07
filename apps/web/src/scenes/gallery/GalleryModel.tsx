import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { ColColliders } from "../collision/colColliders";
import { GalleryFloorCollider } from "./GalleryFloorCollider";
import { useGallerySpawn } from "./useGallerySpawn";
import {
  ENABLE_GALLERY_RUNTIME_SHADOWS,
  GALLERY_BULB,
  GALLERY_GLB_URL,
  GLTF_DRACO_DECODER_PATH,
  USE_OUTSIDE_GALLERY_SPAWN,
} from "./galleryConfig";
import { prepareGalleryScene } from "./prepareGalleryScene";
import {
  resolveGallerySafetyCenter,
  resolveGallerySafetyGroundY,
  resolveGallerySpawn,
  resolveOutsideGallerySpawn,
} from "./resolveGallerySpawn";
import { GallerySpawnValidator } from "./GallerySpawnValidator";

function GalleryBulbLights({
  bulbs,
}: {
  bulbs: { name: string; position: [number, number, number] }[];
}) {
  if (bulbs.length === 0) return null;

  return (
    <>
      {bulbs.map((b) => (
        <pointLight
          key={b.name}
          position={b.position}
          intensity={GALLERY_BULB.intensity}
          distance={GALLERY_BULB.distance}
          decay={2}
          color={GALLERY_BULB.color}
          castShadow={ENABLE_GALLERY_RUNTIME_SHADOWS}
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
        />
      ))}
    </>
  );
}

export function GalleryModel() {
  const gltf = useGLTF(GALLERY_GLB_URL, GLTF_DRACO_DECODER_PATH);
  const { spawn, setSpawn, setSafetyGroundY, setSafetyCenter } = useGallerySpawn();
  const { bulbs } = useMemo(() => prepareGalleryScene(gltf.scene), [gltf.scene]);

  useEffect(() => {
    setSpawn(
      USE_OUTSIDE_GALLERY_SPAWN
        ? resolveOutsideGallerySpawn(gltf.scene)
        : resolveGallerySpawn(gltf.scene),
    );
    setSafetyGroundY(resolveGallerySafetyGroundY(gltf.scene));
    const [x, z] = resolveGallerySafetyCenter(gltf.scene);
    setSafetyCenter(x, z);
  }, [gltf.scene, setSpawn, setSafetyGroundY, setSafetyCenter]);

  return (
    <group>
      <primitive object={gltf.scene} />
      <GalleryFloorCollider root={gltf.scene} />
      <GalleryBulbLights bulbs={bulbs} />
      <ColColliders root={gltf.scene} />
      {!USE_OUTSIDE_GALLERY_SPAWN ? (
        <GallerySpawnValidator root={gltf.scene} spawn={spawn} onRespawn={setSpawn} />
      ) : null}
    </group>
  );
}

useGLTF.preload(GALLERY_GLB_URL, GLTF_DRACO_DECODER_PATH);
