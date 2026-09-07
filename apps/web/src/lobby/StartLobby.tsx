import "../runtime/suppressThirdPartyDeprecationWarnings";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  createRoot,
  extend,
  unmountComponentAtNode,
  useLoader,
  type RootStore,
} from "@react-three/fiber";
import {
  AmbientLight,
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
  START_LOBBY_INTRO_ASSEMBLED_CLOCK_S,
  START_LOBBY_INTRO_LETTER_STAGGER_MS,
  START_LOBBY_INTRO_SPACE_DELAY_MS,
  type LobbyShatterClock,
} from "./startLobbyIntroShatter";
import {
  injectLobbyShatterMaterial,
  prepareLobbyShatterGeometry,
} from "./startLobbyShatterMaterial";
import {
  createStartLobbyRootOwner,
  type StartLobbyRootOwner,
} from "./startLobbyRootOwner";
import { releaseStartLobbyRouteRenderer } from "./startLobbyRendererRelease";
import { syncStartLobbyViewport } from "./startLobbyViewport";
import { StartLobbyBarrage, type StartLobbyBarrageHandle } from "./StartLobbyBarrage";
import { StartLobbyIntro } from "./StartLobbyIntro";
import "./startLobby.css";

extend({
  AmbientLight,
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

type LobbyWordReady = (word: string) => void;

const START_LOBBY_WORD_COUNT = 2;

function LobbyWord({
  text,
  size,
  y,
  shatterClock,
  wordDelayMs = 0,
  onReady,
}: {
  text: string;
  size: number;
  y: number;
  shatterClock: LobbyShatterClock;
  wordDelayMs?: number;
  onReady(): void;
}) {
  const font = useLoader(FontLoader, helvetikerFontUrl);
  const geometry = useMemo(
    () =>
      prepareLobbyShatterGeometry(createCenteredTextGeometry(text, font, size, 0.32), {
        seed: 11,
        wordDelayMs,
      }),
    [font, size, text, wordDelayMs],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => onReady(), [onReady]);

  const onBeforeCompile = useMemo(() => injectLobbyShatterMaterial(shatterClock), [shatterClock]);

  return (
    <mesh geometry={geometry} position={[0, y, 0]}>
      <meshToonMaterial attach="material-0" color="#f3f0e7" transparent onBeforeCompile={onBeforeCompile} />
      <meshToonMaterial attach="material-1" color="#182b2d" transparent onBeforeCompile={onBeforeCompile} />
    </mesh>
  );
}

function LobbyEvenlySpacedWord({
  text,
  size,
  letterGap,
  pairGapAdjustments,
  y,
  shatterClock,
  wordDelayMs = 0,
  onReady,
}: {
  text: string;
  size: number;
  letterGap: number;
  pairGapAdjustments?: Readonly<Record<string, number>>;
  y: number;
  shatterClock: LobbyShatterClock;
  wordDelayMs?: number;
  onReady(): void;
}) {
  const font = useLoader(FontLoader, helvetikerFontUrl);
  const letters = useMemo(() => {
    const geometries = Array.from(text, (letter) =>
      createCenteredTextGeometry(letter, font, size, 0.32),
    );
    const widths = geometries.map((geometry) => {
      const bounds = geometry.boundingBox;
      return bounds ? bounds.max.x - bounds.min.x : size;
    });
    const gaps = Array.from({ length: Math.max(0, text.length - 1) }, (_, index) => {
      const pair = `${text[index]}${text[index + 1]}`;
      return letterGap + (pairGapAdjustments?.[pair] ?? 0);
    });
    const totalWidth =
      widths.reduce((sum, width) => sum + width, 0) +
      gaps.reduce((sum, gap) => sum + gap, 0);
    let cursor = -totalWidth / 2;

    return geometries.map((geometry, index) => {
      const width = widths[index] ?? size;
      const x = cursor + width / 2;
      cursor += width + (gaps[index] ?? 0);
      return {
        geometry: prepareLobbyShatterGeometry(geometry, {
          seed: 23 + index * 101,
          wordDelayMs: wordDelayMs + index * START_LOBBY_INTRO_LETTER_STAGGER_MS,
        }),
        x,
      };
    });
  }, [font, letterGap, pairGapAdjustments, size, text, wordDelayMs]);

  useEffect(
    () => () => {
      letters.forEach(({ geometry }) => geometry.dispose());
    },
    [letters],
  );
  useEffect(() => onReady(), [onReady]);

  const onBeforeCompile = useMemo(() => injectLobbyShatterMaterial(shatterClock), [shatterClock]);

  return (
    <group position={[0, y, 0]}>
      {letters.map(({ geometry, x }, index) => (
        <mesh key={`${text}-${index}`} geometry={geometry} position={[x, 0, 0]}>
          <meshToonMaterial attach="material-0" color="#f3f0e7" transparent onBeforeCompile={onBeforeCompile} />
          <meshToonMaterial attach="material-1" color="#182b2d" transparent onBeforeCompile={onBeforeCompile} />
        </mesh>
      ))}
    </group>
  );
}

function LobbyTypography({
  artRef,
  shatterClock,
  onWordReady,
}: {
  artRef: RefObject<Group | null>;
  shatterClock: LobbyShatterClock;
  onWordReady: LobbyWordReady;
}) {
  const handleTitleReady = useCallback(() => onWordReady("title"), [onWordReady]);
  const handleSpaceReady = useCallback(() => onWordReady("space"), [onWordReady]);
  return (
    <group ref={artRef} rotation={[-0.025, 0.035, 0]}>
      <LobbyWord
        text="LIZZARDKEVIN"
        size={0.38}
        y={0.58}
        shatterClock={shatterClock}
        onReady={handleTitleReady}
      />
      <LobbyEvenlySpacedWord
        text="SPACE"
        size={1.24}
        letterGap={0.1}
        pairGapAdjustments={{ PA: -0.08, AC: -0.07 }}
        y={-0.72}
        shatterClock={shatterClock}
        wordDelayMs={START_LOBBY_INTRO_SPACE_DELAY_MS}
        onReady={handleSpaceReady}
      />
    </group>
  );
}

function LobbyScene({
  artRef,
  shatterClock,
  onWordReady,
}: {
  artRef: RefObject<Group | null>;
  shatterClock: LobbyShatterClock;
  onWordReady: LobbyWordReady;
}) {
  return (
    <>
      <fog attach="fog" args={["#69827e", 8, 18]} />
      <ambientLight intensity={1.9} />
      <directionalLight position={[-3, 5, 7]} intensity={2.4} />
      <Suspense fallback={null}>
        <LobbyTypography artRef={artRef} shatterClock={shatterClock} onWordReady={onWordReady} />
      </Suspense>
    </>
  );
}

export default function StartLobby({ disposing, onTrustedEnter, onDisposed }: StartLobbyProps) {
  const containerRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const barrageRef = useRef<StartLobbyBarrageHandle>(null);
  const artRef = useRef<Group>(null);
  const storeRef = useRef<RootStore | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const rootOwnerRef = useRef<StartLobbyRootOwner<LobbyRoot> | null>(null);
  const effectMountedRef = useRef(false);
  const routeCleanupStartedRef = useRef(false);
  const releaseStartedRef = useRef(false);
  const disposedRef = useRef(false);
  const initPromiseRef = useRef<Promise<void> | null>(null);
  const fadeReleaseRef = useRef<(() => void) | null>(null);
  // reduced-motion 不播 intro:时钟直接停在聚合终态,标题静止完整。
  const shatterClockRef = useRef<LobbyShatterClock>({
    value: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? START_LOBBY_INTRO_ASSEMBLED_CLOCK_S
      : 0,
  });
  const [introMounted, setIntroMounted] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [introActive, setIntroActive] = useState(introMounted);
  const [typographyReady, setTypographyReady] = useState(false);
  const readyWordsRef = useRef<Set<string>>(new Set());
  const handleIntroSettled = useCallback(() => setIntroActive(false), []);
  const handleIntroExited = useCallback(() => setIntroMounted(false), []);
  const handleWordReady = useCallback((word: string) => {
    const readyWords = readyWordsRef.current;
    if (readyWords.has(word)) return;
    readyWords.add(word);
    if (readyWords.size >= START_LOBBY_WORD_COUNT) setTypographyReady(true);
  }, []);

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
              alpha: true,
              powerPreference: "low-power",
            });
            renderer.setClearAlpha(0);
            if (routeCleanupStartedRef.current) releaseStartLobbyRouteRenderer(renderer);
            else rendererRef.current = renderer;
            return renderer;
          },
        })
        .then((configuredRoot) => {
          if (!effectMountedRef.current || releaseStartedRef.current) return;
          const store = configuredRoot.render(
            <LobbyScene
              artRef={artRef}
              shatterClock={shatterClockRef.current}
              onWordReady={handleWordReady}
            />,
          );
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
  }, [handleWordReady]);

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
    const finishDisposal = () => {
      if (disposedRef.current) return;
      disposedRef.current = true;
      storeRef.current = null;
      rendererRef.current = null;
      onDisposed();
    };

    const startRelease = () => {
      if (releaseStartedRef.current) return;
      releaseStartedRef.current = true;
      void (initPromiseRef.current ?? Promise.resolve()).then(() => {
        const rootOwner = rootOwnerRef.current;
        if (!rootOwner) finishDisposal();
        else rootOwner.dispose(finishDisposal);
      });
    };

    // 非弱化动效时先等 fade-to-white 动画播完再释放 R3F（main 的 onAnimationEnd 触发）；
    // 动画缺失（reduced-motion 等）时立即释放，避免卡在 disposing。
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      startRelease();
      return;
    }
    fadeReleaseRef.current = startRelease;
  }, [disposing, onDisposed]);

  const applyPointerTilt = useCallback((clientX: number, clientY: number) => {
    barrageRef.current?.setPointer(clientX, clientY);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const art = artRef.current;
    const store = storeRef.current;
    if (!art || !store) return;
    const tilt = resolveStartLobbyTilt(clientX, clientY, window.innerWidth, window.innerHeight);
    art.rotation.set(tilt.x, tilt.y, 0);
    store.getState().invalidate();
  }, []);

  const resetPointerTilt = useCallback(() => {
    barrageRef.current?.resetPointer();
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
      data-intro={introActive && !disposing ? "active" : "settled"}
      onPointerMove={(event) => applyPointerTilt(event.clientX, event.clientY)}
      onPointerDown={(event) => applyPointerTilt(event.clientX, event.clientY)}
      onPointerLeave={resetPointerTilt}
      onAnimationEnd={(event) => {
        if (event.animationName !== "startLobbyFadeToWhite") return;
        fadeReleaseRef.current?.();
      }}
    >
      <h1 className="start-lobby__accessible-title">LizzardKevin Space</h1>
      <StartLobbyBarrage ref={barrageRef} />
      <canvas ref={canvasRef} className="start-lobby__canvas" aria-hidden="true" />
      {introMounted && !disposing ? (
        <StartLobbyIntro
          ready={typographyReady}
          clockRef={shatterClockRef}
          storeRef={storeRef}
          onSettled={handleIntroSettled}
          onExited={handleIntroExited}
        />
      ) : null}
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
