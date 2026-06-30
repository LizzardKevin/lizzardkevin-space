import { RigidBody } from "@react-three/rapier";
import type { ExhibitTarget } from "../exhibits/exhibitTarget";
import type { ExhibitManifestItem } from "../exhibits/manifest";
import { ExhibitHoverHighlight } from "../exhibits/ExhibitHoverHighlight";
import { ExhibitTargetLabel } from "../exhibits/ExhibitTargetLabel";
import { ExhibitRaycast } from "./exhibits/ExhibitRaycast";
import { GuardedPointerLockControls } from "./controls/GuardedPointerLockControls";
import { PlayerController } from "./Player/PlayerController";
import { ENABLE_GALLERY_GLB, ENABLE_GALLERY_WALL_ART, GALLERY_WALL_ART } from "./gallery/galleryConfig";
import { GalleryModel } from "./gallery/GalleryModel";
import { GallerySpawnProvider } from "./gallery/GallerySpawnProvider";
import { useGallerySpawn } from "./gallery/useGallerySpawn";
import { SafetyGround } from "./gallery/SafetyGround";
import { WallPicture } from "./gallery/WallPicture";
import { SpaceOnboarding } from "./onboarding/SpaceOnboarding";
import type { SpacePlayerPose } from "../space/spaceDailyResume";
import type { SpaceQualityConfig } from "../space/spaceVisualSettings";

function SpaceSceneContent({
  exhibitTarget,
  onTargetChange,
  loadExhibits,
  projectorExhibits,
  onSceneExhibitsReady,
  onSceneReady,
  pointerControlsEnabled,
  controlsEnabled,
  onFocusExhibit,
  onEmptyClick,
  suppressNextClick,
  onConsumeSuppressedClick,
  onJumpNotice,
  onboardingEnabled,
  pointerLocked,
  onboardingFocusVisible,
  initialPose,
  onPoseSample,
  onOnboardingCompleted,
  quality,
}: {
  exhibitTarget: ExhibitTarget | null;
  onTargetChange: (target: ExhibitTarget | null) => void;
  loadExhibits: boolean;
  projectorExhibits: ExhibitManifestItem[] | null;
  onSceneExhibitsReady: () => void;
  onSceneReady?: () => void;
  pointerControlsEnabled: boolean;
  controlsEnabled: boolean;
  onFocusExhibit: (exhibitId: string) => void;
  onEmptyClick: () => void;
  suppressNextClick: boolean;
  onConsumeSuppressedClick: () => void;
  onJumpNotice: (message: string) => void;
  onboardingEnabled: boolean;
  pointerLocked: boolean;
  onboardingFocusVisible: boolean;
  initialPose?: SpacePlayerPose | null;
  onPoseSample?: (pose: SpacePlayerPose) => void;
  onOnboardingCompleted?: () => void;
  quality: SpaceQualityConfig;
}) {
  const { spawn, safetyGroundY, safetyCenterX, safetyCenterZ } = useGallerySpawn();

  return (
    <>
      {pointerControlsEnabled ? <GuardedPointerLockControls selector="#space-canvas" /> : null}

      {ENABLE_GALLERY_GLB ? <SafetyGround y={safetyGroundY} centerX={safetyCenterX} centerZ={safetyCenterZ} /> : null}
      {ENABLE_GALLERY_GLB ? (
        <GalleryModel
          loadExhibits={loadExhibits}
          onExhibitsReady={onSceneExhibitsReady}
          onSceneReady={onSceneReady}
          quality={quality}
          projectorExhibits={projectorExhibits}
          projectorInteractive={controlsEnabled && !onboardingEnabled}
          projectorPlaying={controlsEnabled && !onboardingEnabled}
        />
      ) : null}

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

      <PlayerController
        enabled={controlsEnabled}
        spawn={ENABLE_GALLERY_GLB ? spawn : undefined}
        onJumpNotice={onJumpNotice}
        initialPose={initialPose}
        onPoseSample={onPoseSample}
      />

      <ExhibitTargetLabel target={controlsEnabled ? exhibitTarget : null} />
      <ExhibitHoverHighlight target={controlsEnabled ? exhibitTarget : null} />
      <SpaceOnboarding
        enabled={onboardingEnabled}
        pointerLocked={pointerLocked}
        focusDemoVisible={onboardingFocusVisible}
        onCompleted={onOnboardingCompleted}
      />
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
  loadExhibits,
  projectorExhibits,
  onSceneExhibitsReady,
  onSceneReady,
  pointerControlsEnabled,
  controlsEnabled,
  onFocusExhibit,
  onEmptyClick,
  suppressNextClick,
  onConsumeSuppressedClick,
  onJumpNotice,
  onboardingEnabled,
  pointerLocked,
  onboardingFocusVisible,
  initialPose,
  onPoseSample,
  onOnboardingCompleted,
  quality,
}: {
  exhibitTarget: ExhibitTarget | null;
  onTargetChange: (target: ExhibitTarget | null) => void;
  loadExhibits: boolean;
  projectorExhibits: ExhibitManifestItem[] | null;
  onSceneExhibitsReady: () => void;
  onSceneReady?: () => void;
  pointerControlsEnabled: boolean;
  controlsEnabled: boolean;
  onFocusExhibit: (exhibitId: string) => void;
  onEmptyClick: () => void;
  suppressNextClick: boolean;
  onConsumeSuppressedClick: () => void;
  onJumpNotice: (message: string) => void;
  onboardingEnabled: boolean;
  pointerLocked: boolean;
  onboardingFocusVisible: boolean;
  initialPose?: SpacePlayerPose | null;
  onPoseSample?: (pose: SpacePlayerPose) => void;
  onOnboardingCompleted?: () => void;
  quality: SpaceQualityConfig;
}) {
  if (ENABLE_GALLERY_GLB) {
    return (
      <GallerySpawnProvider>
        <SpaceSceneContent
          exhibitTarget={exhibitTarget}
          onTargetChange={onTargetChange}
          loadExhibits={loadExhibits}
          projectorExhibits={projectorExhibits}
          onSceneExhibitsReady={onSceneExhibitsReady}
          onSceneReady={onSceneReady}
          pointerControlsEnabled={pointerControlsEnabled}
          controlsEnabled={controlsEnabled}
          onFocusExhibit={onFocusExhibit}
          onEmptyClick={onEmptyClick}
          suppressNextClick={suppressNextClick}
          onConsumeSuppressedClick={onConsumeSuppressedClick}
          onJumpNotice={onJumpNotice}
          onboardingEnabled={onboardingEnabled}
          pointerLocked={pointerLocked}
          onboardingFocusVisible={onboardingFocusVisible}
          initialPose={initialPose}
          onPoseSample={onPoseSample}
          onOnboardingCompleted={onOnboardingCompleted}
          quality={quality}
        />
      </GallerySpawnProvider>
    );
  }

  return (
    <SpaceSceneContent
      exhibitTarget={exhibitTarget}
      onTargetChange={onTargetChange}
      loadExhibits={loadExhibits}
      projectorExhibits={projectorExhibits}
      onSceneExhibitsReady={onSceneExhibitsReady}
      onSceneReady={onSceneReady}
      pointerControlsEnabled={pointerControlsEnabled}
      controlsEnabled={controlsEnabled}
      onFocusExhibit={onFocusExhibit}
      onEmptyClick={onEmptyClick}
      suppressNextClick={suppressNextClick}
      onConsumeSuppressedClick={onConsumeSuppressedClick}
      onJumpNotice={onJumpNotice}
      onboardingEnabled={onboardingEnabled}
      pointerLocked={pointerLocked}
      onboardingFocusVisible={onboardingFocusVisible}
      initialPose={initialPose}
      onPoseSample={onPoseSample}
      onOnboardingCompleted={onOnboardingCompleted}
      quality={quality}
    />
  );
}
