import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import {
  SPACE_ONBOARDING_DEMO_EXHIBIT_ID,
  SPACE_ONBOARDING_DEMO_HIT_POSITION,
  SPACE_ONBOARDING_DEMO_HIT_SIZE,
  SPACE_ONBOARDING_DONE_VISIBLE_MS,
  SPACE_ONBOARDING_LOOK_HIT_ID,
  SPACE_ONBOARDING_LOOK_HIT_POSITION,
  SPACE_ONBOARDING_LOOK_HIT_SIZE,
  SPACE_ONBOARDING_SIGNS,
  SPACE_ONBOARDING_SPAWN,
  type SpaceOnboardingSign,
  type SpaceOnboardingSignStepId,
} from "./spaceOnboardingConfig.ts";
import {
  createInitialSpaceOnboardingState,
  reduceSpaceOnboardingState,
  type SpaceOnboardingEvent,
  type SpaceOnboardingState,
} from "./spaceOnboardingState.ts";
import {
  createInitialSpaceOnboardingSignQueueState,
  updateSpaceOnboardingSignQueue,
  type SpaceOnboardingVisibleSign,
  type SpaceOnboardingSignQueueState,
} from "./spaceOnboardingSignVisibility.ts";

function activeSignIdForState(state: SpaceOnboardingState): SpaceOnboardingSignStepId | null {
  if (state.completed || state.step === "focus") return null;
  return state.step;
}

function SpaceOnboardingSignText({
  sign,
  status,
}: {
  sign: SpaceOnboardingSign;
  status: SpaceOnboardingVisibleSign["status"];
}) {
  const { t } = useTranslation();
  const imageStyle = {
    "--space-onboarding-sign-image-width": `${sign.displayWidthPx}px`,
  } as CSSProperties;
  const className = [
    "space-onboarding-sign",
    sign.className ?? "",
    status === "enter" ? "space-onboarding-sign--entering" : "",
    sign.id === "relock" ? "space-onboarding-sign--swapping" : "",
    status === "exiting" ? "space-onboarding-sign--exiting" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Html
      position={sign.position}
      transform
      sprite
      center
      distanceFactor={1.35}
      zIndexRange={[38, 0]}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div className={className} role="img" aria-label={t(sign.textKey)} style={imageStyle}>
        <img
          className="space-onboarding-sign__image"
          src={sign.imageSrc}
          alt=""
          width={sign.imageWidthPx}
          height={sign.imageHeightPx}
          draggable={false}
        />
      </div>
    </Html>
  );
}

export function SpaceOnboarding({
  enabled,
  pointerLocked,
  focusDemoVisible,
}: {
  enabled: boolean;
  pointerLocked: boolean;
  focusDemoVisible: boolean;
}) {
  const camera = useThree((state) => state.camera);
  const [onboardingState, setOnboardingState] =
    useState<SpaceOnboardingState>(createInitialSpaceOnboardingState);
  const [signQueue, setSignQueue] = useState<SpaceOnboardingSignQueueState>(
    createInitialSpaceOnboardingSignQueueState,
  );
  const stateRef = useRef(onboardingState);
  const previousFocusVisibleRef = useRef(focusDemoVisible);
  const previousPointerLockedRef = useRef(pointerLocked);
  const lookHitMeshRef = useRef<THREE.Mesh>(null);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const raycastCenter = useMemo(() => new THREE.Vector2(0, 0), []);

  const demoHitUserData = useMemo(
    () => ({ exhibitId: SPACE_ONBOARDING_DEMO_EXHIBIT_ID }),
    [],
  );
  const lookHitUserData = useMemo(
    () => ({ onboardingTargetId: SPACE_ONBOARDING_LOOK_HIT_ID }),
    [],
  );

  const dispatch = useCallback((event: SpaceOnboardingEvent) => {
    setOnboardingState((current) => {
      const next = reduceSpaceOnboardingState(current, event);
      stateRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    stateRef.current = onboardingState;
  }, [onboardingState]);

  useEffect(() => {
    const wasVisible = previousFocusVisibleRef.current;
    if (focusDemoVisible && !wasVisible) dispatch({ type: "demoOpened" });
    if (!focusDemoVisible && wasVisible) dispatch({ type: "demoClosed" });
    previousFocusVisibleRef.current = focusDemoVisible;
  }, [dispatch, focusDemoVisible]);

  useEffect(() => {
    const wasLocked = previousPointerLockedRef.current;
    if (!pointerLocked && wasLocked) dispatch({ type: "escUnlocked" });
    if (pointerLocked && !wasLocked) dispatch({ type: "relocked" });
    previousPointerLockedRef.current = pointerLocked;
  }, [dispatch, pointerLocked]);

  useEffect(() => {
    if (onboardingState.step !== "done" || onboardingState.completed) return;
    const timer = window.setTimeout(
      () => dispatch({ type: "doneViewed" }),
      SPACE_ONBOARDING_DONE_VISIBLE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [dispatch, onboardingState.completed, onboardingState.step]);

  useFrame(() => {
    if (!enabled) return;
    const current = stateRef.current;
    const nowMs = performance.now();

    setSignQueue((currentQueue) =>
      updateSpaceOnboardingSignQueue(currentQueue, {
        activeSignId: activeSignIdForState(current),
        cameraZ: camera.position.z,
        nowMs,
      }),
    );

    if (current.completed) return;

    if (current.step === "move") {
      dispatch({
        type: "moveProgress",
        distanceM: Math.max(0, camera.position.z - SPACE_ONBOARDING_SPAWN[2]),
      });
      return;
    }

    if (current.step === "look") {
      if (!lookHitMeshRef.current) {
        return;
      }
      raycaster.setFromCamera(raycastCenter, camera);
      if (raycaster.intersectObject(lookHitMeshRef.current, false).length > 0) {
        dispatch({ type: "lookTargeted" });
      }
    }
  });

  if (!enabled) return null;

  const showLookHit = onboardingState.step === "look";
  const showDemoHit = onboardingState.step === "demo";

  return (
    <group name="space_onboarding">
      {signQueue.signs.map((visibleSign) => (
        <SpaceOnboardingSignText
          key={
            visibleSign.id === "esc" || visibleSign.id === "relock"
              ? "esc-relock"
              : visibleSign.id
          }
          sign={SPACE_ONBOARDING_SIGNS[visibleSign.id]}
          status={visibleSign.status}
        />
      ))}
      {showLookHit ? (
        <mesh
          ref={lookHitMeshRef}
          name="space_onboarding_look_hit"
          position={SPACE_ONBOARDING_LOOK_HIT_POSITION}
          userData={lookHitUserData}
        >
          <boxGeometry args={SPACE_ONBOARDING_LOOK_HIT_SIZE} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}
      {showDemoHit ? (
        <mesh
          name="space_onboarding_demo_hit"
          position={SPACE_ONBOARDING_DEMO_HIT_POSITION}
          userData={demoHitUserData}
        >
          <boxGeometry args={SPACE_ONBOARDING_DEMO_HIT_SIZE} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}
    </group>
  );
}
