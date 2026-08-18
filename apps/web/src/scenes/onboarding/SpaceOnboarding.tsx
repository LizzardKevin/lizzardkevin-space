import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import {
  SPACE_ONBOARDING_COMPLETE_FADE_MS,
  SPACE_ONBOARDING_SIGNS,
  type SpaceOnboardingSign,
} from "./spaceOnboardingConfig.ts";
import {
  createInitialSpaceOnboardingState,
  reduceSpaceOnboardingState,
  type SpaceOnboardingEvent,
  type SpaceOnboardingState,
} from "./spaceOnboardingState.ts";

function SpaceOnboardingSignText({
  sign,
  active,
  exiting,
}: {
  sign: SpaceOnboardingSign;
  active: boolean;
  exiting: boolean;
}) {
  const { t } = useTranslation();
  const className = [
    "space-onboarding-sign",
    active ? "space-onboarding-sign--active" : "",
    exiting ? "space-onboarding-sign--exiting" : "",
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
      <div className={className}>
        <span className="space-onboarding-sign__text">{t(sign.textKey)}</span>
        {sign.keycaps ? (
          <span className="space-onboarding-sign__keycaps" aria-hidden>
            {sign.keycaps.map((cap) => (
              <kbd key={cap} className="space-onboarding-sign__keycap">
                {cap}
              </kbd>
            ))}
          </span>
        ) : null}
      </div>
    </Html>
  );
}

export function SpaceOnboarding({
  enabled,
  onCompleted,
}: {
  enabled: boolean;
  onCompleted?: () => void;
}) {
  const camera = useThree((state) => state.camera);
  const [onboardingState, setOnboardingState] =
    useState<SpaceOnboardingState>(createInitialSpaceOnboardingState);
  const stateRef = useRef(onboardingState);
  const moveStartZRef = useRef<number | null>(null);
  const lookStartQuaternionRef = useRef<THREE.Quaternion | null>(null);
  const completedCallbackFiredRef = useRef(false);
  const onCompletedRef = useRef(onCompleted);

  const dispatch = useCallback((event: SpaceOnboardingEvent) => {
    setOnboardingState((current) => {
      const next = reduceSpaceOnboardingState(current, event);
      stateRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    stateRef.current = onboardingState;
    if (onboardingState.step === "look" && lookStartQuaternionRef.current === null) {
      lookStartQuaternionRef.current = camera.quaternion.clone();
    }
  }, [camera, onboardingState]);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
  }, [onCompleted]);

  useEffect(() => {
    if (!onboardingState.completed || completedCallbackFiredRef.current) return;
    const timer = window.setTimeout(() => {
      completedCallbackFiredRef.current = true;
      onCompletedRef.current?.();
    }, SPACE_ONBOARDING_COMPLETE_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [onboardingState.completed]);

  useFrame(() => {
    if (!enabled) return;
    const current = stateRef.current;

    if (current.step === "move") {
      moveStartZRef.current ??= camera.position.z;
      dispatch({
        type: "moveProgress",
        distanceM: Math.max(0, camera.position.z - moveStartZRef.current),
      });
      return;
    }

    if (current.step === "look") {
      lookStartQuaternionRef.current ??= camera.quaternion.clone();
      dispatch({
        type: "lookChanged",
        radians: lookStartQuaternionRef.current.angleTo(camera.quaternion),
      });
    }
  });

  if (!enabled) return null;

  return (
    <group name="space_onboarding">
      {Object.values(SPACE_ONBOARDING_SIGNS).map((sign) => (
        <SpaceOnboardingSignText
          key={sign.id}
          sign={sign}
          active={!onboardingState.completed && onboardingState.step === sign.id}
          exiting={onboardingState.completed && sign.id === "look"}
        />
      ))}
    </group>
  );
}
