import { Physics, useRapier } from "@react-three/rapier";
import { Suspense, useEffect } from "react";
import type { ExhibitTarget } from "../exhibits/exhibitTarget";
import type { ExhibitManifestItem } from "../exhibits/manifest";
import { GalleryRenderPipeline } from "../rendering/GalleryRenderPipeline";
import type { RendererProfile } from "../rendering/rendererProfile";
import { SpaceScene } from "../scenes/SpaceScene";
import type { SpaceJumpNoticeKey } from "../scenes/Player/PlayerController";
import { GalleryAtmosphere } from "../scenes/gallery/GalleryAtmosphere";
import {
  ENABLE_GALLERY_TOON,
  GALLERY_TOON,
} from "../scenes/gallery/galleryConfig";
import type { ProjectorSlideCommand } from "../scenes/projector/projectorSlides";
import type { SpacePlayerPose } from "./spaceDailyResume";
import type { SpaceQualityConfig } from "./spaceVisualSettings";

const SPACE_PHYSICS_TIME_STEP = 1 / 60;

function PhysicsBootBoundary({ onReady }: { onReady: () => void }) {
  useRapier();
  useEffect(() => onReady(), [onReady]);
  return null;
}

export type SpaceSessionProps = {
  profile: RendererProfile;
  quality: SpaceQualityConfig;
  exhibitTarget: ExhibitTarget | null;
  onTargetChange: (target: ExhibitTarget | null) => void;
  loadExhibits: boolean;
  projectorExhibits: ExhibitManifestItem[] | null;
  onPhysicsReady: () => void;
  onEnvironmentReady: () => void;
  onGalleryReady: () => void;
  onExhibitReady: (exhibitId: string) => void;
  onExhibitFailed: (exhibitId: string) => void;
  onExhibitDeferred: (exhibitId: string) => void;
  pointerControlsEnabled: boolean;
  controlsEnabled: boolean;
  projectorCommand: ProjectorSlideCommand | null;
  onFocusExhibit: (exhibitId: string) => void;
  onEmptyClick: () => void;
  suppressNextClick: boolean;
  onConsumeSuppressedClick: () => void;
  onJumpNotice: (messageKey: SpaceJumpNoticeKey) => void;
  onboardingEnabled: boolean;
  pointerLocked: boolean;
  onboardingFocusVisible: boolean;
  initialPose: SpacePlayerPose | null;
  onPoseSample: (pose: SpacePlayerPose) => void;
  onOnboardingCompleted: () => void;
};

export function SpaceSession({
  profile,
  quality,
  onPhysicsReady,
  ...sceneProps
}: SpaceSessionProps) {
  return (
    <>
      <color attach="background" args={[GALLERY_TOON.background]} />
      {ENABLE_GALLERY_TOON && profile.expensiveLeaves.galleryAtmosphere ? (
        <GalleryAtmosphere />
      ) : null}
      <ambientLight intensity={ENABLE_GALLERY_TOON ? GALLERY_TOON.ambientIntensity : 0.42} />
      {ENABLE_GALLERY_TOON ? (
        <>
          <directionalLight
            position={GALLERY_TOON.keyLight.position}
            intensity={GALLERY_TOON.keyLight.intensity}
            color={GALLERY_TOON.keyLight.color}
          />
          <directionalLight
            position={GALLERY_TOON.fillLight.position}
            intensity={GALLERY_TOON.fillLight.intensity}
            color={GALLERY_TOON.fillLight.color}
          />
        </>
      ) : null}
      <hemisphereLight
        args={
          ENABLE_GALLERY_TOON
            ? [
                GALLERY_TOON.hemisphere.sky,
                GALLERY_TOON.hemisphere.ground,
                GALLERY_TOON.hemisphere.intensity,
              ]
            : ["#e8eef5", "#8a8078", 0.35]
        }
      />
      <Suspense
        fallback={
          <group>
            <mesh position={[0, 1.6, 0]}>
              <boxGeometry args={[0.8, 0.2, 0.8]} />
              <meshToonMaterial color="#7a7a7a" />
            </mesh>
          </group>
        }
      >
        <Physics gravity={[0, -9.81, 0]} timeStep={SPACE_PHYSICS_TIME_STEP}>
          <PhysicsBootBoundary onReady={onPhysicsReady} />
          <SpaceScene {...sceneProps} quality={quality} />
        </Physics>
        {profile.postProcessing ? <GalleryRenderPipeline bloom={quality.post.bloom} /> : null}
      </Suspense>
    </>
  );
}
