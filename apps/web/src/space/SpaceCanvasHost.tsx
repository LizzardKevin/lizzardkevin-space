import "../runtime/suppressThirdPartyDeprecationWarnings";
import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { BootAttemptErrorBoundary } from "../boot/BootAttemptErrorBoundary";
import { isBootReportingEnabled } from "../boot/bootReportingGate";
import { watchRendererDeviceLoss } from "../boot/rendererDeviceLoss";
import {
  disposeOwnedBootRenderer,
  replaceWatchedBootRenderer,
  type DisposableBootRenderer,
} from "../boot/ownedBootRenderer";
import {
  createRendererGeneration,
  resolveRendererGeneration,
  runForActiveRendererGeneration,
} from "../boot/rendererGeneration";
import type { SpaceBootController } from "../boot/useSpaceBootController";
import { createWebGPURenderer } from "../rendering/createWebGPURenderer";
import {
  RENDERER_PROFILES,
  resolveRendererDpr,
  switchRendererProfileState,
  type RendererProfile,
} from "../rendering/rendererProfile";
import {
  bridgeRendererInitialization,
  reportRendererInitializationErrorIfMounted,
} from "../rendering/rendererLifecycle";
import {
  ENABLE_GALLERY_GLB,
  ENABLE_GALLERY_RUNTIME_SHADOWS,
  GALLERY_SPAWN,
} from "../scenes/gallery/galleryConfig";
import { spawnToCameraPosition } from "../scenes/gallery/resolveGallerySpawn";
import type { SpacePlayerPose } from "./spaceDailyResume";
import { SpaceSession, type SpaceSessionProps } from "./SpaceSession";
import { useSpaceVisualSettings } from "./spaceVisualSettings";

type BootOwnedSessionCallbacks =
  | "onPhysicsReady"
  | "onEnvironmentReady"
  | "onGalleryReady"
  | "onExhibitReady"
  | "onExhibitFailed"
  | "onExhibitDeferred";

type SpaceCanvasSessionProps = Omit<
  SpaceSessionProps,
  "profile" | "quality" | "initialPose" | BootOwnedSessionCallbacks
>;

export function SpaceCanvasHost({
  boot,
  entered,
  entryIsFading,
  paused,
  initialPose,
  latestPoseRef,
  session,
  onCanvasReady,
  onProfileResolved,
  onRendererError,
}: {
  boot: SpaceBootController;
  entered: boolean;
  entryIsFading: boolean;
  paused: boolean;
  initialPose: SpacePlayerPose | null;
  latestPoseRef: RefObject<SpacePlayerPose | null>;
  session: SpaceCanvasSessionProps;
  onCanvasReady?: () => void;
  onProfileResolved: (profile: RendererProfile | null) => void;
  onRendererError: (error: Error | null) => void;
}) {
  const {
    state: bootState,
    milestoneReady,
    exhibitReady,
    exhibitFailed,
    exhibitDeferred,
    fail: failBoot,
    deviceLost,
  } = boot;
  const attemptId = bootState.attemptId;
  const { quality, settings } = useSpaceVisualSettings();
  const requestedProfile = bootState.forceWebGL ? "simplified" : settings.qualityPreset;
  const [rendererGeneration, setRendererGeneration] = useState(() =>
    createRendererGeneration(attemptId, requestedProfile),
  );
  if (
    rendererGeneration.attemptId !== attemptId ||
    rendererGeneration.requestedProfile !== requestedProfile
  ) {
    setRendererGeneration(
      resolveRendererGeneration(rendererGeneration, attemptId, requestedProfile),
    );
  }
  const rendererGenerationRef = useRef(rendererGeneration);
  useLayoutEffect(() => {
    rendererGenerationRef.current = rendererGeneration;
  }, [rendererGeneration]);
  const [rendererRuntime, setRendererRuntime] = useState<{
    attemptId: number;
    requestedProfile: "full" | "simplified";
    initialPose: SpacePlayerPose | null;
    nonce: number;
    resolvedProfile: RendererProfile | null;
    error: Error | null;
  }>(() => ({
    attemptId,
    requestedProfile,
    initialPose,
    nonce: rendererGeneration.nonce,
    resolvedProfile: null,
    error: null,
  }));
  const rendererScopeMatches =
    rendererRuntime.attemptId === attemptId &&
    rendererRuntime.requestedProfile === requestedProfile &&
    rendererRuntime.nonce === rendererGeneration.nonce;
  const resolvedProfile = rendererScopeMatches ? rendererRuntime.resolvedProfile : null;
  const activeRendererError = rendererScopeMatches ? rendererRuntime.error : null;
  const rendererOwnerMountedRef = useRef(true);
  const rendererLossCleanupRef = useRef<(() => void) | null>(null);
  const ownedRendererRef = useRef<DisposableBootRenderer | null>(null);
  const bootReportingScopeRef = useRef({ attemptId, phase: bootState.phase });

  useLayoutEffect(() => {
    bootReportingScopeRef.current = { attemptId, phase: bootState.phase };
  }, [attemptId, bootState.phase]);
  const canReportBootProgress = useCallback(
    (reportedAttemptId: number) =>
      isBootReportingEnabled(bootReportingScopeRef.current, reportedAttemptId),
    [],
  );

  useEffect(() => {
    onProfileResolved(resolvedProfile);
    onRendererError(activeRendererError);
  }, [activeRendererError, onProfileResolved, onRendererError, resolvedProfile]);

  useEffect(() => {
    rendererOwnerMountedRef.current = true;
    return () => {
      rendererOwnerMountedRef.current = false;
      rendererLossCleanupRef.current?.();
      rendererLossCleanupRef.current = null;
    };
  }, []);

  const bootAttemptFailed = bootState.phase === "failed";
  useEffect(() => {
    return () => {
      rendererLossCleanupRef.current?.();
      rendererLossCleanupRef.current = null;
      disposeOwnedBootRenderer(ownedRendererRef);
    };
  }, [attemptId, bootAttemptFailed, requestedProfile]);

  const handlePhysicsReady = useCallback(() => {
    if (canReportBootProgress(attemptId)) milestoneReady(attemptId, "physics");
  }, [attemptId, canReportBootProgress, milestoneReady]);
  const handleEnvironmentReady = useCallback(() => {
    if (canReportBootProgress(attemptId)) milestoneReady(attemptId, "environment");
  }, [attemptId, canReportBootProgress, milestoneReady]);
  const handleGalleryReady = useCallback(() => {
    if (canReportBootProgress(attemptId)) milestoneReady(attemptId, "gallery");
    onCanvasReady?.();
  }, [attemptId, canReportBootProgress, milestoneReady, onCanvasReady]);
  const handleExhibitReady = useCallback((exhibitId: string) => {
    if (canReportBootProgress(attemptId)) exhibitReady(attemptId, exhibitId);
  }, [attemptId, canReportBootProgress, exhibitReady]);
  const handleExhibitFailed = useCallback((exhibitId: string) => {
    if (canReportBootProgress(attemptId)) exhibitFailed(attemptId, exhibitId);
  }, [attemptId, canReportBootProgress, exhibitFailed]);
  const handleExhibitDeferred = useCallback((exhibitId: string) => {
    if (canReportBootProgress(attemptId)) exhibitDeferred(attemptId, exhibitId);
  }, [attemptId, canReportBootProgress, exhibitDeferred]);
  const handleBootSubtreeError = useCallback((failedAttemptId: number, error: Error) => {
    failBoot(failedAttemptId, error);
  }, [failBoot]);

  const useShadows = !ENABLE_GALLERY_GLB || ENABLE_GALLERY_RUNTIME_SHADOWS;

  return (
    <BootAttemptErrorBoundary attemptId={attemptId} onError={handleBootSubtreeError}>
      {activeRendererError || bootState.phase === "failed" ? null : (
        <div
          className={`space-canvasWrap${entered ? "" : " space-canvasWrap--entry"}${entryIsFading ? " space-canvasWrap--entryFading" : ""}${paused ? " space-canvasWrap--disabled" : ""}`}
        >
          <Canvas
            key={`space-canvas-${attemptId}-${requestedProfile}`}
            frameloop={paused ? "never" : "always"}
            id="space-canvas"
            style={{ position: "absolute", inset: 0 }}
            dpr={resolveRendererDpr(resolvedProfile)}
            gl={(props) =>
              bridgeRendererInitialization(
                createWebGPURenderer({
                  canvas: props.canvas as HTMLCanvasElement,
                  requestedProfile,
                  onResolved: (resolution) => {
                    runForActiveRendererGeneration(
                      rendererGenerationRef.current,
                      rendererGeneration,
                      () => {
                        setRendererRuntime((current) => {
                          if (!runForActiveRendererGeneration(
                            rendererGenerationRef.current,
                            rendererGeneration,
                            () => undefined,
                          )) return current;
                          const switched = switchRendererProfileState(
                            current,
                            requestedProfile,
                            latestPoseRef.current ?? initialPose,
                          );
                          return {
                            ...switched,
                            attemptId,
                            requestedProfile,
                            nonce: rendererGeneration.nonce,
                            initialPose: latestPoseRef.current ?? initialPose,
                            resolvedProfile: RENDERER_PROFILES[resolution.profile],
                            error: null,
                          };
                        });
                        if (canReportBootProgress(attemptId)) {
                          milestoneReady(attemptId, "renderer");
                        }
                      },
                    );
                  },
                }).then((renderer) => {
                  if (!runForActiveRendererGeneration(
                    rendererGenerationRef.current,
                    rendererGeneration,
                    () => undefined,
                  )) {
                    renderer.dispose();
                    throw new Error("Renderer initialization superseded by a newer generation");
                  }
                  replaceWatchedBootRenderer(ownedRendererRef, rendererLossCleanupRef, renderer);
                  rendererLossCleanupRef.current = watchRendererDeviceLoss(
                    renderer,
                    props.canvas as HTMLCanvasElement,
                    (error) => {
                      runForActiveRendererGeneration(
                        rendererGenerationRef.current,
                        rendererGeneration,
                        () => deviceLost(attemptId, error),
                      );
                    },
                  );
                  return renderer;
                }),
                (error) => {
                  if (!runForActiveRendererGeneration(
                    rendererGenerationRef.current,
                    rendererGeneration,
                    () => undefined,
                  )) return;
                  reportRendererInitializationErrorIfMounted(
                    () => rendererOwnerMountedRef.current,
                    (reportedError) => {
                      if (!runForActiveRendererGeneration(
                        rendererGenerationRef.current,
                        rendererGeneration,
                        () => undefined,
                      )) return;
                      setRendererRuntime((current) =>
                        current.attemptId === attemptId &&
                        current.requestedProfile === requestedProfile &&
                        current.nonce === rendererGeneration.nonce
                          ? {
                              ...current,
                              error:
                                reportedError instanceof Error
                                  ? reportedError
                                  : new Error("Renderer initialization failed"),
                            }
                          : current,
                      );
                      failBoot(attemptId, reportedError);
                    },
                    error,
                  );
                },
              )
            }
            camera={{
              fov: 70,
              near: 0.01,
              far: 200,
              position: ENABLE_GALLERY_GLB
                ? spawnToCameraPosition(GALLERY_SPAWN)
                : [0, 1.6, 6],
            }}
            shadows={resolvedProfile ? resolvedProfile.shadows && useShadows : false}
            onCreated={({ gl }) => {
              gl.domElement.id = "space-canvas";
            }}
          >
            {resolvedProfile ? (
              <SpaceSession
                {...session}
                profile={resolvedProfile}
                quality={quality}
                onPhysicsReady={handlePhysicsReady}
                onEnvironmentReady={handleEnvironmentReady}
                onGalleryReady={handleGalleryReady}
                onExhibitReady={handleExhibitReady}
                onExhibitFailed={handleExhibitFailed}
                onExhibitDeferred={handleExhibitDeferred}
                initialPose={rendererRuntime.initialPose}
              />
            ) : null}
          </Canvas>
        </div>
      )}
    </BootAttemptErrorBoundary>
  );
}
