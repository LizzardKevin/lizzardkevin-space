import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { ExhibitManifestItem } from "../../exhibits/manifest.ts";
import { fitProjectorImageToScreen } from "./projectorLayout.ts";
import { preloadProjectorImageTexture, useProjectorImageTexture } from "./projectorTexture";
import { buildProjectorSlides, type ProjectorSlide, type ProjectorSlideCommand } from "./projectorSlides";
import { useProjectorSlideshow } from "./useProjectorSlideshow";
import { useRegisterExhibitInteractionTarget } from "../exhibits/exhibitInteractionRegistry";

const PROJECTOR_SCREEN_NODE_NAME = "EXHIBITS_Projector_001";
const PROJECTOR_SCREEN_FRONT_OFFSET = 0.055;
const PROJECTOR_SCANLINE_FRONT_OFFSET = 0.006;
const PROJECTOR_SCREEN_WIDTH_RATIO = 0.84;
const PROJECTOR_SCREEN_HEIGHT_RATIO = 0.72;
const PROJECTOR_SCREEN_OPACITY = 0.88;
const PROJECTOR_INTERACTION_DISTANCE = 25;
const PROJECTOR_SCANLINE_OPACITY = 0.34;

type ProjectorLayout = {
  screenPosition: [number, number, number];
  screenSize: [number, number];
};

function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return (object as THREE.Mesh).isMesh === true;
}

function findProjectorScreen(root: THREE.Object3D): THREE.Mesh | null {
  let screen: THREE.Mesh | null = null;
  root.traverse((object) => {
    if (screen || !isMesh(object)) return;
    if (object.name === PROJECTOR_SCREEN_NODE_NAME) screen = object;
  });
  return screen;
}

type ProjectorScreenUserDataSnapshot = {
  exhibitId: unknown;
  exhibitMaxDistance: unknown;
  disableExhibitHoverHighlight: unknown;
  interactionKind: unknown;
};

function captureProjectorScreenUserData(screen: THREE.Mesh): ProjectorScreenUserDataSnapshot {
  return {
    exhibitId: screen.userData.exhibitId,
    exhibitMaxDistance: screen.userData.exhibitMaxDistance,
    disableExhibitHoverHighlight: screen.userData.disableExhibitHoverHighlight,
    interactionKind: screen.userData.interactionKind,
  };
}

function restoreProjectorScreenUserData(
  screen: THREE.Mesh,
  snapshot: ProjectorScreenUserDataSnapshot,
) {
  if (snapshot.exhibitId === undefined) {
    delete screen.userData.exhibitId;
  } else {
    screen.userData.exhibitId = snapshot.exhibitId;
  }
  if (snapshot.exhibitMaxDistance === undefined) {
    delete screen.userData.exhibitMaxDistance;
  } else {
    screen.userData.exhibitMaxDistance = snapshot.exhibitMaxDistance;
  }
  if (snapshot.disableExhibitHoverHighlight === undefined) {
    delete screen.userData.disableExhibitHoverHighlight;
  } else {
    screen.userData.disableExhibitHoverHighlight = snapshot.disableExhibitHoverHighlight;
  }
  if (snapshot.interactionKind === undefined) {
    delete screen.userData.interactionKind;
  } else {
    screen.userData.interactionKind = snapshot.interactionKind;
  }
}

function applyProjectorScreenTarget(
  screen: THREE.Mesh,
  slide: ProjectorSlide | null,
  interactive: boolean,
) {
  if (interactive && slide) {
    screen.userData.exhibitId = slide.exhibitId;
    screen.userData.exhibitMaxDistance = PROJECTOR_INTERACTION_DISTANCE;
    screen.userData.disableExhibitHoverHighlight = true;
    screen.userData.interactionKind = "projector";
    return;
  }

  delete screen.userData.exhibitId;
  delete screen.userData.exhibitMaxDistance;
  delete screen.userData.disableExhibitHoverHighlight;
  delete screen.userData.interactionKind;
}

function resolveProjectorLayout(screen: THREE.Mesh): ProjectorLayout {
  screen.updateWorldMatrix(true, false);
  const box = new THREE.Box3().setFromObject(screen);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  const screenWidth = size.x * PROJECTOR_SCREEN_WIDTH_RATIO;
  const screenHeight = size.y * PROJECTOR_SCREEN_HEIGHT_RATIO;
  const screenZ = box.min.z - PROJECTOR_SCREEN_FRONT_OFFSET;
  const screenPosition = new THREE.Vector3(center.x, center.y + 0.05, screenZ);

  return {
    screenPosition: screenPosition.toArray(),
    screenSize: [screenWidth, screenHeight],
  };
}

function disableProjectorRaycast() {}

function createProjectorScanlineTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y += 5) {
      context.fillStyle = "rgba(0, 0, 0, 0.72)";
      context.fillRect(0, y, canvas.width, 1);
      context.fillStyle = "rgba(255, 255, 255, 0.08)";
      context.fillRect(0, y + 2, canvas.width, 1);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function useProjectorScanlineTexture() {
  const texture = useMemo(() => createProjectorScanlineTexture(), []);

  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);

  return texture;
}

function scaleScanlineOpacity(imageOpacity: number) {
  return (imageOpacity / PROJECTOR_SCREEN_OPACITY) * PROJECTOR_SCANLINE_OPACITY;
}

function ProjectorScreenLayer({
  slide,
  opacity,
  materialRef,
  position,
  screenSize,
}: {
  slide: ProjectorSlide | null;
  opacity: number;
  materialRef: RefObject<THREE.MeshBasicMaterial | null>;
  position: [number, number, number];
  screenSize: [number, number];
}) {
  if (!slide) return null;

  return (
    <ProjectorScreenLayerSurface
      slide={slide}
      opacity={opacity}
      materialRef={materialRef}
      position={position}
      screenSize={screenSize}
    />
  );
}

function ProjectorScreenLayerSurface({
  slide,
  opacity,
  materialRef,
  position,
  screenSize,
}: {
  slide: ProjectorSlide;
  opacity: number;
  materialRef: RefObject<THREE.MeshBasicMaterial | null>;
  position: [number, number, number];
  screenSize: [number, number];
}) {
  const texture = useProjectorImageTexture(slide.imageUrl);
  const scanlineTexture = useProjectorScanlineTexture();
  const fittedScreenSize = useMemo(() => {
    const image = texture.image as { width?: number; height?: number } | undefined;
    return fitProjectorImageToScreen({
      imageWidth: image?.width ?? 0,
      imageHeight: image?.height ?? 0,
      screenWidth: screenSize[0],
      screenHeight: screenSize[1],
    });
  }, [screenSize, texture]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.map = texture;
    material.needsUpdate = true;
  }, [materialRef, texture]);

  return (
    <group position={position}>
      <mesh name="PROJECTOR_WALL_IMAGE" renderOrder={8} raycast={disableProjectorRaycast}>
        <planeGeometry args={fittedScreenSize} />
        <meshBasicMaterial
          ref={materialRef}
          map={texture}
          color="#ffffff"
          transparent
          opacity={opacity}
          depthTest
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        name="PROJECTOR_WALL_SCANLINES"
        position={[0, 0, -PROJECTOR_SCANLINE_FRONT_OFFSET]}
        renderOrder={9}
        raycast={disableProjectorRaycast}
      >
        <planeGeometry args={fittedScreenSize} />
        <meshBasicMaterial
          map={scanlineTexture}
          color="#111111"
          transparent
          opacity={scaleScanlineOpacity(opacity)}
          depthTest
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function ProjectorTexturePreload({ slide }: { slide: ProjectorSlide | null }) {
  useEffect(() => {
    if (!slide) return;
    preloadProjectorImageTexture(slide.imageUrl);
  }, [slide]);

  return null;
}

export function SpaceProjectorInstallation({
  root,
  exhibits,
  interactive,
  command,
}: {
  root: THREE.Object3D;
  exhibits: ExhibitManifestItem[] | null;
  interactive: boolean;
  command: ProjectorSlideCommand | null;
}) {
  const screen = useMemo(() => findProjectorScreen(root), [root]);
  const layout = useMemo(() => (screen ? resolveProjectorLayout(screen) : null), [screen]);
  const slides = useMemo(() => buildProjectorSlides(exhibits ?? []), [exhibits]);
  const { activeSlide, preloadSlide } = useProjectorSlideshow({
    slides,
    command,
  });
  const activeMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    if (!screen) return;
    const previousUserData = captureProjectorScreenUserData(screen);
    applyProjectorScreenTarget(screen, activeSlide, interactive);

    return () => {
      restoreProjectorScreenUserData(screen, previousUserData);
    };
  }, [activeSlide, interactive, screen]);
  useRegisterExhibitInteractionTarget(screen, Boolean(screen && activeSlide && interactive));

  if (!layout || slides.length === 0) return null;

  return (
    <group>
      <Suspense fallback={null}>
        <ProjectorScreenLayer
          slide={activeSlide}
          opacity={PROJECTOR_SCREEN_OPACITY}
          materialRef={activeMaterialRef}
          position={layout.screenPosition}
          screenSize={layout.screenSize}
        />
        <ProjectorTexturePreload slide={preloadSlide} />
      </Suspense>
    </group>
  );
}
