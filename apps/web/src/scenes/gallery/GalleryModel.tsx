import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { ColColliders } from "../collision/colColliders";
import { ExhibitPlacement } from "../exhibits/SceneExhibitPlacement";
import type { ExhibitManifestItem } from "../../exhibits/manifest";
import type { SpaceQualityConfig } from "../../space/spaceVisualSettings";
import { SpaceProjectorInstallation } from "../projector/SpaceProjectorInstallation";
import type { ProjectorSlideCommand } from "../projector/projectorSlides";
import { TempBlockerNotices } from "./TempBlockerNotices";
import { useGallerySpawn } from "./useGallerySpawn";
import {
  ENABLE_GALLERY_LIGHT_HALOS,
  ENABLE_GALLERY_RUNTIME_SHADOWS,
  GALLERY_BULB,
  GALLERY_GLB_URL,
  GALLERY_LIGHT_HALO,
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
import { applyGalleryLightEmissiveIntensity } from "./galleryStyleMaterials";

function GalleryBulbLights({
  bulbs,
  quality,
}: {
  bulbs: { name: string; position: [number, number, number] }[];
  quality: SpaceQualityConfig;
}) {
  if (bulbs.length === 0) return null;

  return (
    <>
      {bulbs.map((b) => (
        <pointLight
          key={b.name}
          position={b.position}
          intensity={quality.lighting.bulbIntensity}
          distance={quality.lighting.bulbDistance}
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

function GalleryLightHalos({
  lights,
}: {
  lights: { name: string; position: [number, number, number] }[];
}) {
  const visibleLights = useMemo(() => {
    if (lights.length <= GALLERY_LIGHT_HALO.maxCount) return lights;
    if (GALLERY_LIGHT_HALO.maxCount <= 0) return [];

    const lastIndex = lights.length - 1;
    const step = lastIndex / Math.max(GALLERY_LIGHT_HALO.maxCount - 1, 1);
    return Array.from({ length: GALLERY_LIGHT_HALO.maxCount }, (_, index) => {
      return lights[Math.round(index * step)];
    });
  }, [lights]);

  const material = useMemo(() => {
    const spriteMaterial = new THREE.SpriteMaterial({
      color: GALLERY_LIGHT_HALO.color,
      opacity: GALLERY_LIGHT_HALO.opacity,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });
    spriteMaterial.toneMapped = false;
    return spriteMaterial;
  }, []);

  useEffect(() => () => material.dispose(), [material]);

  if (!ENABLE_GALLERY_LIGHT_HALOS || visibleLights.length === 0) return null;

  return (
    <>
      {visibleLights.map((light) => (
        <sprite
          key={light.name}
          material={material}
          position={light.position}
          scale={[GALLERY_LIGHT_HALO.scale, GALLERY_LIGHT_HALO.scale, 1]}
          raycast={() => null}
        />
      ))}
    </>
  );
}

export function GalleryModel({
  loadExhibits,
  sceneExhibits,
  onEnvironmentReady,
  onGalleryReady,
  onExhibitReady,
  onExhibitFailed,
  onExhibitDeferred,
  quality,
  projectorExhibits,
  projectorInteractive,
  projectorCommand,
}: {
  loadExhibits: boolean;
  sceneExhibits: ExhibitManifestItem[] | null;
  onEnvironmentReady: () => void;
  onGalleryReady: () => void;
  onExhibitReady: (exhibitId: string) => void;
  onExhibitFailed: (exhibitId: string) => void;
  onExhibitDeferred: (exhibitId: string) => void;
  quality: SpaceQualityConfig;
  projectorExhibits: ExhibitManifestItem[] | null;
  projectorInteractive: boolean;
  projectorCommand: ProjectorSlideCommand | null;
}) {
  const gltf = useGLTF(GALLERY_GLB_URL, GLTF_DRACO_DECODER_PATH);
  const { spawn, setSpawn, setSafetyGroundY, setSafetyCenter } = useGallerySpawn();
  const { bulbs, lightHalos } = useMemo(() => prepareGalleryScene(gltf.scene), [gltf.scene]);

  useEffect(() => {
    onEnvironmentReady();
  }, [gltf.scene, onEnvironmentReady]);

  useEffect(() => {
    setSpawn(
      USE_OUTSIDE_GALLERY_SPAWN
        ? resolveOutsideGallerySpawn(gltf.scene)
        : resolveGallerySpawn(gltf.scene),
    );
    setSafetyGroundY(resolveGallerySafetyGroundY(gltf.scene));
    const [x, z] = resolveGallerySafetyCenter(gltf.scene);
    setSafetyCenter(x, z);
    onGalleryReady();
  }, [gltf.scene, onGalleryReady, setSpawn, setSafetyGroundY, setSafetyCenter]);

  useEffect(() => {
    applyGalleryLightEmissiveIntensity(gltf.scene, quality.lighting.lightEmissiveIntensity);
  }, [gltf.scene, quality.lighting.lightEmissiveIntensity]);

  return (
    <group>
      <primitive object={gltf.scene} />
      {ENABLE_GALLERY_LIGHT_HALOS ? <GalleryLightHalos lights={lightHalos} /> : null}
      <GalleryBulbLights bulbs={bulbs} quality={quality} />
      <SpaceProjectorInstallation
        root={gltf.scene}
        exhibits={projectorExhibits}
        interactive={projectorInteractive}
        command={projectorCommand}
      />
      <TempBlockerNotices root={gltf.scene} />
      <ExhibitPlacement
        root={gltf.scene}
        enabled={loadExhibits}
        exhibits={sceneExhibits}
        onExhibitReady={onExhibitReady}
        onExhibitFailed={onExhibitFailed}
        onExhibitDeferred={onExhibitDeferred}
      />
      <ColColliders root={gltf.scene} />
      {!USE_OUTSIDE_GALLERY_SPAWN ? (
        <GallerySpawnValidator root={gltf.scene} spawn={spawn} onRespawn={setSpawn} />
      ) : null}
    </group>
  );
}

useGLTF.preload(GALLERY_GLB_URL, GLTF_DRACO_DECODER_PATH);
