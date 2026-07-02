import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import * as THREE from "three";
import { isTempBlockerMeshName } from "./prepareGalleryScene";

export const TEMP_BLOCKER_NOTICE_DISTANCE_M = 3;

const TEMP_BLOCKER_NOTICE_SURFACE_OFFSET_M = 0.04;
const TEMP_BLOCKER_NOTICE_MIN_HEIGHT_M = 1.25;
const TEMP_BLOCKER_NOTICE_TOP_INSET_M = 0.45;

type TempBlockerNoticeSpec = {
  name: string;
  box: THREE.Box3;
  position: [number, number, number];
  quaternion: THREE.Quaternion;
};

function isMesh(obj: THREE.Object3D): obj is THREE.Mesh {
  return !!obj && (obj as THREE.Mesh).isMesh === true;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveTempBlockerNoticeTransform(box: THREE.Box3): {
  position: [number, number, number];
  quaternion: THREE.Quaternion;
} {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const position = center.clone();

  const useXAxis = size.x <= size.z;
  const axis = useXAxis ? "x" : "z";
  const halfDepth = (useXAxis ? size.x : size.z) / 2;
  const inwardDirection = center[axis] >= 0 ? -1 : 1;
  position[axis] = center[axis] + inwardDirection * (halfDepth + TEMP_BLOCKER_NOTICE_SURFACE_OFFSET_M);
  const surfaceNormal = useXAxis
    ? new THREE.Vector3(inwardDirection, 0, 0)
    : new THREE.Vector3(0, 0, inwardDirection);

  const readableY = box.min.y + TEMP_BLOCKER_NOTICE_MIN_HEIGHT_M;
  const upperY = box.max.y - TEMP_BLOCKER_NOTICE_TOP_INSET_M;
  position.y = upperY > readableY ? clamp(center.y, readableY, upperY) : center.y;

  return {
    position: [position.x, position.y, position.z],
    quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), surfaceNormal),
  };
}

function collectTempBlockerNoticeSpecs(root: THREE.Object3D): TempBlockerNoticeSpec[] {
  root.updateMatrixWorld(true);
  const specs: TempBlockerNoticeSpec[] = [];

  root.traverse((obj) => {
    if (!isMesh(obj) || !isTempBlockerMeshName(obj.name)) return;
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    const transform = resolveTempBlockerNoticeTransform(box);
    specs.push({
      name: obj.name,
      box: box.clone(),
      position: transform.position,
      quaternion: transform.quaternion,
    });
  });

  return specs;
}

export function TempBlockerNotices({ root }: { root: THREE.Object3D }) {
  const { i18n, t } = useTranslation();
  const noticeLanguage = i18n.resolvedLanguage ?? i18n.language;
  const camera = useThree((state) => state.camera);
  const specs = useMemo(() => collectTempBlockerNoticeSpecs(root), [root]);
  const [activeKey, setActiveKey] = useState("");

  useFrame(() => {
    const nextKey = specs
      .filter((spec) => spec.box.distanceToPoint(camera.position) <= TEMP_BLOCKER_NOTICE_DISTANCE_M)
      .map((spec) => spec.name)
      .join("|");
    setActiveKey((currentKey) => (currentKey === nextKey ? currentKey : nextKey));
  });

  const activeNames = useMemo(() => new Set(activeKey ? activeKey.split("|") : []), [activeKey]);
  if (specs.length === 0) return null;

  return (
    <>
      {specs.map((spec) => {
        const active = activeNames.has(spec.name);
        return (
          <group key={spec.name} position={spec.position} quaternion={spec.quaternion}>
            <Html
              key={noticeLanguage}
              transform
              occlude
              center
              distanceFactor={7}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              <div
                className={`space-temp-blocker-notice${active ? " space-temp-blocker-notice--active" : ""}`}
                role="note"
                aria-hidden={!active}
              >
                {t("space.tempBlocker.notice")}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}
