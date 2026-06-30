import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { ExhibitManifestItem } from "../../exhibits/manifest.ts";
import { useProjectorImageTexture } from "./projectorTexture";
import {
  PROJECTOR_CROSSFADE_MS,
  buildProjectorSlides,
  type ProjectorSlide,
} from "./projectorSlides";
import { useProjectorSlideshow } from "./useProjectorSlideshow";

const PROJECTOR_SCREEN_NODE_NAME = "EXHIBITS_Projector_001";
const PROJECTOR_SCREEN_FRONT_OFFSET = 0.055;
const PROJECTOR_SCANLINE_FRONT_OFFSET = 0.006;
const PROJECTOR_SCREEN_WIDTH_RATIO = 0.84;
const PROJECTOR_SCREEN_HEIGHT_RATIO = 0.72;
const PROJECTOR_SCREEN_OPACITY = 0.88;
const PROJECTOR_INTERACTION_DISTANCE = 25;
const PROJECTOR_SCANLINE_OPACITY = 0.34;
const PROJECTOR_FLICKER_STRENGTH = 0.9;

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
};

function captureProjectorScreenUserData(screen: THREE.Mesh): ProjectorScreenUserDataSnapshot {
  return {
    exhibitId: screen.userData.exhibitId,
    exhibitMaxDistance: screen.userData.exhibitMaxDistance,
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
}

function applyProjectorScreenTarget(
  screen: THREE.Mesh,
  slide: ProjectorSlide | null,
  interactive: boolean,
) {
  if (interactive && slide) {
    screen.userData.exhibitId = slide.exhibitId;
    screen.userData.exhibitMaxDistance = PROJECTOR_INTERACTION_DISTANCE;
    return;
  }

  delete screen.userData.exhibitId;
  delete screen.userData.exhibitMaxDistance;
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
  scanlineMaterialRef,
  position,
  screenSize,
}: {
  slide: ProjectorSlide | null;
  opacity: number;
  materialRef: RefObject<THREE.MeshBasicMaterial | null>;
  scanlineMaterialRef: RefObject<THREE.MeshBasicMaterial | null>;
  position: [number, number, number];
  screenSize: [number, number];
}) {
  if (!slide) return null;

  return (
    <ProjectorScreenLayerSurface
      slide={slide}
      opacity={opacity}
      materialRef={materialRef}
      scanlineMaterialRef={scanlineMaterialRef}
      position={position}
      screenSize={screenSize}
    />
  );
}

function ProjectorScreenLayerSurface({
  slide,
  opacity,
  materialRef,
  scanlineMaterialRef,
  position,
  screenSize,
}: {
  slide: ProjectorSlide;
  opacity: number;
  materialRef: RefObject<THREE.MeshBasicMaterial | null>;
  scanlineMaterialRef: RefObject<THREE.MeshBasicMaterial | null>;
  position: [number, number, number];
  screenSize: [number, number];
}) {
  const texture = useProjectorImageTexture(slide.imageUrl);
  const scanlineTexture = useProjectorScanlineTexture();

  useEffect(() => {
    const material = materialRef.current;
    if (!material) return;
    material.map = texture;
    material.needsUpdate = true;
  }, [materialRef, texture]);

  return (
    <group position={position}>
      <mesh name="PROJECTOR_WALL_IMAGE" renderOrder={8} raycast={disableProjectorRaycast}>
        <planeGeometry args={screenSize} />
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
        <planeGeometry args={screenSize} />
        <meshBasicMaterial
          ref={scanlineMaterialRef}
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

export function SpaceProjectorInstallation({
  root,
  exhibits,
  interactive,
  playing,
}: {
  root: THREE.Object3D;
  exhibits: ExhibitManifestItem[] | null;
  interactive: boolean;
  playing: boolean;
}) {
  const screen = useMemo(() => findProjectorScreen(root), [root]);
  const layout = useMemo(() => (screen ? resolveProjectorLayout(screen) : null), [screen]);
  const slides = useMemo(() => buildProjectorSlides(exhibits ?? []), [exhibits]);
  const { activeIndex, activeSlide, previousSlide, prefersReducedMotion } = useProjectorSlideshow({
    slides,
    playing,
  });
  const activeMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const previousMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const activeScanlineMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const previousScanlineMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const transitionStartRef = useRef(0);

  useEffect(() => {
    transitionStartRef.current = performance.now();
  }, [activeIndex]);

  useEffect(() => {
    if (!screen) return;
    const previousUserData = captureProjectorScreenUserData(screen);
    applyProjectorScreenTarget(screen, activeSlide, interactive);

    return () => {
      restoreProjectorScreenUserData(screen, previousUserData);
    };
  }, [activeSlide, interactive, screen]);

  useFrame(() => {
    const activeMaterial = activeMaterialRef.current;
    const previousMaterial = previousMaterialRef.current;
    const activeScanlineMaterial = activeScanlineMaterialRef.current;
    const previousScanlineMaterial = previousScanlineMaterialRef.current;
    const timeSec = performance.now() / 1000;
    const flicker =
      1 +
      (Math.sin(timeSec * 31) * 0.018 +
        (THREE.MathUtils.seededRandom(Math.floor(timeSec * 22)) - 0.5) * 0.045) *
        PROJECTOR_FLICKER_STRENGTH;
    if (prefersReducedMotion || !previousSlide) {
      if (activeMaterial) {
        activeMaterial.opacity = prefersReducedMotion
          ? PROJECTOR_SCREEN_OPACITY
          : PROJECTOR_SCREEN_OPACITY * flicker;
      }
      if (activeScanlineMaterial) {
        activeScanlineMaterial.opacity = scaleScanlineOpacity(PROJECTOR_SCREEN_OPACITY);
      }
      if (previousMaterial) previousMaterial.opacity = 0;
      if (previousScanlineMaterial) previousScanlineMaterial.opacity = 0;
      return;
    }
    const elapsed = performance.now() - transitionStartRef.current;
    const progress = THREE.MathUtils.smoothstep(
      Math.min(1, elapsed / PROJECTOR_CROSSFADE_MS),
      0,
      1,
    );
    const breath = 1 + Math.sin(performance.now() / 1300) * 0.018;
    if (activeMaterial) {
      activeMaterial.opacity =
        THREE.MathUtils.lerp(0.18, PROJECTOR_SCREEN_OPACITY, progress) * breath * flicker;
      if (activeScanlineMaterial) {
        activeScanlineMaterial.opacity = scaleScanlineOpacity(activeMaterial.opacity);
      }
    }
    if (previousMaterial) {
      previousMaterial.opacity = THREE.MathUtils.lerp(PROJECTOR_SCREEN_OPACITY, 0, progress);
      if (previousScanlineMaterial) {
        previousScanlineMaterial.opacity = scaleScanlineOpacity(previousMaterial.opacity);
      }
    }
  });

  if (!layout || slides.length === 0) return null;

  return (
    <group>
      <Suspense fallback={null}>
        <ProjectorScreenLayer
          slide={previousSlide}
          opacity={0}
          materialRef={previousMaterialRef}
          scanlineMaterialRef={previousScanlineMaterialRef}
          position={layout.screenPosition}
          screenSize={layout.screenSize}
        />
        <ProjectorScreenLayer
          slide={activeSlide}
          opacity={PROJECTOR_SCREEN_OPACITY}
          materialRef={activeMaterialRef}
          scanlineMaterialRef={activeScanlineMaterialRef}
          position={layout.screenPosition}
          screenSize={layout.screenSize}
        />
      </Suspense>
    </group>
  );
}
