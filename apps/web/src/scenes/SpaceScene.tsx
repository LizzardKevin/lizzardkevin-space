import { PointerLockControls } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import type { ExhibitTarget } from "../exhibits/exhibitTarget";
import { ExhibitHoverHighlight } from "../exhibits/ExhibitHoverHighlight";
import { ExhibitTargetLabel } from "../exhibits/ExhibitTargetLabel";
import { ExhibitRaycast } from "./exhibits/ExhibitRaycast";
import { PlayerController } from "./Player/PlayerController";
import { ENABLE_GALLERY_GLB, ENABLE_GALLERY_WALL_ART, GALLERY_WALL_ART } from "./gallery/galleryConfig";
import { GalleryModel } from "./gallery/GalleryModel";
import { GallerySpawnProvider, useGallerySpawn } from "./gallery/GallerySpawnContext";
import { SafetyGround } from "./gallery/SafetyGround";
import { WallPicture } from "./gallery/WallPicture";

function SpaceSceneContent({
  exhibitTarget,
  onTargetChange,
  controlsEnabled,
  onFocusExhibit,
  onEmptyClick,
  suppressNextClick,
  onConsumeSuppressedClick,
}: {
  exhibitTarget: ExhibitTarget | null;
  onTargetChange: (target: ExhibitTarget | null) => void;
  controlsEnabled: boolean;
  onFocusExhibit: (exhibitId: string) => void;
  onEmptyClick: () => void;
  suppressNextClick: boolean;
  onConsumeSuppressedClick: () => void;
}) {
  const { spawn, safetyGroundY, safetyCenterX, safetyCenterZ } = useGallerySpawn();

  return (
    <>
      {controlsEnabled ? <PointerLockControls /> : null}

      {ENABLE_GALLERY_GLB ? <SafetyGround y={safetyGroundY} centerX={safetyCenterX} centerZ={safetyCenterZ} /> : null}
      {ENABLE_GALLERY_GLB ? <GalleryModel /> : null}

      {!ENABLE_GALLERY_GLB ? (
        <RigidBody type="fixed" colliders="trimesh">
          <mesh position={[0, 0, 0]} receiveShadow>
            <boxGeometry args={[18, 0.2, 18]} />
            <meshToonMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 2, -9]} receiveShadow>
            <boxGeometry args={[18, 4, 0.2]} />
            <meshToonMaterial color="#8a8a8a" />
          </mesh>
          <mesh position={[0, 2, 9]} receiveShadow>
            <boxGeometry args={[18, 4, 0.2]} />
            <meshToonMaterial color="#8a8a8a" />
          </mesh>
          <mesh position={[-9, 2, 0]} receiveShadow>
            <boxGeometry args={[0.2, 4, 18]} />
            <meshToonMaterial color="#8a8a8a" />
          </mesh>
          <mesh position={[9, 2, 0]} receiveShadow>
            <boxGeometry args={[0.2, 4, 18]} />
            <meshToonMaterial color="#8a8a8a" />
          </mesh>
        </RigidBody>
      ) : null}

      {ENABLE_GALLERY_GLB && ENABLE_GALLERY_WALL_ART ? (
        <WallPicture
          imageUrl={GALLERY_WALL_ART.imageUrl}
          position={GALLERY_WALL_ART.position}
          rotation={GALLERY_WALL_ART.rotation}
          maxWidth={GALLERY_WALL_ART.maxWidth}
          maxHeight={GALLERY_WALL_ART.maxHeight}
          frameBorder={GALLERY_WALL_ART.frameBorder}
          frameDepth={GALLERY_WALL_ART.frameDepth}
        />
      ) : null}

      <PlayerController enabled={controlsEnabled} spawn={ENABLE_GALLERY_GLB ? spawn : undefined} />

      <ExhibitTargetLabel target={controlsEnabled ? exhibitTarget : null} />
      <ExhibitHoverHighlight target={controlsEnabled ? exhibitTarget : null} />
      <ExhibitRaycast
        onTargetChange={onTargetChange}
        onFocusExhibit={onFocusExhibit}
        onEmptyClick={onEmptyClick}
        suppressNextClick={suppressNextClick}
        onConsumeSuppressedClick={onConsumeSuppressedClick}
        enabled={controlsEnabled}
      />
    </>
  );
}

export function SpaceScene({
  exhibitTarget,
  onTargetChange,
  controlsEnabled,
  onFocusExhibit,
  onEmptyClick,
  suppressNextClick,
  onConsumeSuppressedClick,
}: {
  exhibitTarget: ExhibitTarget | null;
  onTargetChange: (target: ExhibitTarget | null) => void;
  controlsEnabled: boolean;
  onFocusExhibit: (exhibitId: string) => void;
  onEmptyClick: () => void;
  suppressNextClick: boolean;
  onConsumeSuppressedClick: () => void;
}) {
  if (ENABLE_GALLERY_GLB) {
    return (
      <GallerySpawnProvider>
        <SpaceSceneContent
          exhibitTarget={exhibitTarget}
          onTargetChange={onTargetChange}
          controlsEnabled={controlsEnabled}
          onFocusExhibit={onFocusExhibit}
          onEmptyClick={onEmptyClick}
          suppressNextClick={suppressNextClick}
          onConsumeSuppressedClick={onConsumeSuppressedClick}
        />
      </GallerySpawnProvider>
    );
  }

  return (
    <SpaceSceneContent
      exhibitTarget={exhibitTarget}
      onTargetChange={onTargetChange}
      controlsEnabled={controlsEnabled}
      onFocusExhibit={onFocusExhibit}
      onEmptyClick={onEmptyClick}
      suppressNextClick={suppressNextClick}
      onConsumeSuppressedClick={onConsumeSuppressedClick}
    />
  );
}
