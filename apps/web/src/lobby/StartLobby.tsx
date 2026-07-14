import "../runtime/suppressThirdPartyDeprecationWarnings";
import { Suspense, useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import {
  createRoot,
  extend,
  unmountComponentAtNode,
  useLoader,
  type RootStore,
} from "@react-three/fiber";
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  Mesh,
  MeshToonMaterial,
  WebGLRenderer,
} from "three";
import { FontLoader, type Font } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import helvetikerFontUrl from "three/examples/fonts/helvetiker_bold.typeface.json?url";
import { resolveStartLobbyTilt } from "./startLobbyHandoff";
import {
  createStartLobbyRootOwner,
  type StartLobbyRootOwner,
} from "./startLobbyRootOwner";
import { releaseStartLobbyRouteRenderer } from "./startLobbyRendererRelease";
import { syncStartLobbyViewport } from "./startLobbyViewport";
import "./startLobby.css";

extend({
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  Mesh,
  MeshToonMaterial,
});

type LobbyRoot = ReturnType<typeof createRoot>;

type StartLobbyProps = {
  disposing: boolean;
  onTrustedEnter: () => void;
  onDisposed: () => void;
};

function createCenteredTextGeometry(text: string, font: Font, size: number, depth: number) {
  const geometry = new TextGeometry(text, {
    font,
    size,
    depth,
    curveSegments: 3,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.025,
    bevelThickness: 0.025,
  });
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (bounds) {
    geometry.translate(
      -(bounds.min.x + bounds.max.x) / 2,
      -(bounds.min.y + bounds.max.y) / 2,
      0,
    );
  }
  return geometry;
}

function LobbyWord({ text, size, y }: { text: string; size: number; y: number }) {
  const font = useLoader(FontLoader, helvetikerFontUrl);
  const geometry = useMemo(
    () => createCenteredTextGeometry(text, font, size, 0.32),
    [font, size, text],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} position={[0, y, 0]}>
      <meshToonMaterial attach="material-0" color="#f3f0e7" />
      <meshToonMaterial attach="material-1" color="#182b2d" />
    </mesh>
  );
}

function LobbyTypography({ artRef }: { artRef: RefObject<Group | null> }) {
  return (
    <group ref={artRef} rotation={[-0.025, 0.035, 0]}>
      <LobbyWord text="LIZZARDKEVIN" size={0.38} y={0.58} />
      <LobbyWord text="SPACE" size={1.24} y={-0.72} />
    </group>
  );
}

function LobbyScene({ artRef }: { artRef: RefObject<Group | null> }) {
  return (
    <>
      <color attach="background" args={["#69827e"]} />
      <fog attach="fog" args={["#69827e", 8, 18]} />
      <ambientLight intensity={1.9} />
      <directionalLight position={[-3, 5, 7]} intensity={2.4} />
      <mesh position={[0, -3.4, -2.8]} rotation={[-0.18, 0, 0]} scale={[12, 2.4, 1]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color="#4aa7a5" />
      </mesh>
      <mesh position={[-5.2, 1.2, -4.2]} rotation={[0.2, 0.36, -0.14]} scale={[2.8, 5.5, 1]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color="#79cbc6" />
      </mesh>
      <mesh position={[5.6, 0.8, -4.8]} rotation={[-0.15, -0.3, 0.18]} scale={[3.2, 4.8, 1]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color="#358d8e" />
      </mesh>
      <Suspense fallback={null}>
        <LobbyTypography artRef={artRef} />
      </Suspense>
    </>
  );
}

export default function StartLobby({ disposing, onTrustedEnter, onDisposed }: StartLobbyProps) {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const artRef = useRef<Group>(null);
  const storeRef = useRef<RootStore | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const rootOwnerRef = useRef<StartLobbyRootOwner<LobbyRoot> | null>(null);
  const effectMountedRef = useRef(false);
  const routeCleanupStartedRef = useRef(false);
  const releaseStartedRef = useRef(false);
  const disposedRef = useRef(false);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    effectMountedRef.current = true;

    rootOwnerRef.current ??= createStartLobbyRootOwner(
      () => createRoot(canvas),
      (_root, release) => {
        if (release.kind === "route-cleanup") {
          routeCleanupStartedRef.current = true;
          const renderer = rendererRef.current;
          rendererRef.current = null;
          storeRef.current = null;
          if (renderer) releaseStartLobbyRouteRenderer(renderer);
          unmountComponentAtNode(canvas);
          return;
        }
        unmountComponentAtNode(canvas, () => release.onReleased());
      },
    );
    const rootOwner = rootOwnerRef.current;

    try {
      const root = rootOwner.mount();
      initPromiseRef.current ??= root
        .configure({
          frameloop: "demand",
          dpr: [1, 1.25],
          shadows: false,
          camera: { fov: 34, near: 0.1, far: 40, position: [0, 0.1, 11.5] },
          gl: (properties) => {
            const renderer = new WebGLRenderer({
              canvas: properties.canvas as HTMLCanvasElement,
              antialias: true,
              alpha: false,
              powerPreference: "low-power",
            });
            if (routeCleanupStartedRef.current) releaseStartLobbyRouteRenderer(renderer);
            else rendererRef.current = renderer;
            return renderer;
          },
        })
        .then((configuredRoot) => {
          if (!effectMountedRef.current || releaseStartedRef.current) return;
          const store = configuredRoot.render(<LobbyScene artRef={artRef} />);
          storeRef.current = store;
          const bounds = containerRef.current?.getBoundingClientRect();
          if (bounds) syncStartLobbyViewport(store, bounds.width, bounds.height);
        })
        .catch(() => {
          storeRef.current = null;
        });
    } catch {
      initPromiseRef.current = Promise.resolve();
    }

    return () => {
      effectMountedRef.current = false;
      rootOwner.scheduleUnmount();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries.find((candidate) => candidate.target === container);
      if (!entry) return;
      syncStartLobbyViewport(storeRef.current, entry.contentRect.width, entry.contentRect.height);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!disposing || releaseStartedRef.current) return;
    releaseStartedRef.current = true;
    const finishDisposal = () => {
      if (disposedRef.current) return;
      disposedRef.current = true;
      storeRef.current = null;
      rendererRef.current = null;
      onDisposed();
    };

    void (initPromiseRef.current ?? Promise.resolve()).then(() => {
      const rootOwner = rootOwnerRef.current;
      if (!rootOwner) finishDisposal();
      else rootOwner.dispose(finishDisposal);
    });
  }, [disposing, onDisposed]);

  const applyPointerTilt = useCallback((clientX: number, clientY: number) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const art = artRef.current;
    const store = storeRef.current;
    if (!art || !store) return;
    const tilt = resolveStartLobbyTilt(clientX, clientY, window.innerWidth, window.innerHeight);
    art.rotation.set(tilt.x, tilt.y, 0);
    store.getState().invalidate();
  }, []);

  const resetPointerTilt = useCallback(() => {
    const art = artRef.current;
    const store = storeRef.current;
    if (!art || !store || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    art.rotation.set(-0.025, 0.035, 0);
    store.getState().invalidate();
  }, []);

  return (
    <main
      ref={containerRef}
      className="start-lobby"
      data-disposing={disposing ? "true" : "false"}
      onPointerMove={(event) => applyPointerTilt(event.clientX, event.clientY)}
      onPointerDown={(event) => applyPointerTilt(event.clientX, event.clientY)}
      onPointerLeave={resetPointerTilt}
    >
      <h1 className="start-lobby__accessible-title">LizzardKevin Space</h1>
      <canvas ref={canvasRef} className="start-lobby__canvas" aria-hidden="true" />
      <button
        className="start-lobby__enter"
        type="button"
        disabled={disposing}
        onClick={onTrustedEnter}
      >
        Enter
      </button>
    </main>
  );
}
