import * as THREE from "three";
import type { ExhibitManifestItem } from "./manifest";
import { FOCUS_FRAME } from "./focusConfig";

export type FocusFrameResult = {
  cameraPosition: [number, number, number];
  orbitTarget: [number, number, number];
  minDistance: number;
  maxDistance: number;
};

function findPivot(root: THREE.Object3D): THREE.Object3D | null {
  let pivot: THREE.Object3D | null = null;
  root.traverse((obj) => {
    if (pivot) return;
    const name = String(obj.name ?? "");
    if (!name) return;
    const lower = name.toLowerCase();
    if (lower === "pivot" || lower.endsWith("_pivot") || lower.startsWith("pivot_") || lower.includes("pivot")) {
      pivot = obj;
    }
  });
  return pivot;
}

function effectiveViewportAspect(): number {
  if (typeof window === "undefined") return 16 / 9;
  const top = FOCUS_FRAME.topTitleSafePx;
  const bottom = FOCUS_FRAME.bottomPlaybackSafePx;
  const layoutTop = 52;
  const h = Math.max(window.innerHeight - layoutTop - top - bottom, 240);
  return window.innerWidth / h;
}

/** 按模型尺寸缩放并计算初始相机 / Orbit 距离，避免过大或过小。 */
export function fitFocusModelToFrame(root: THREE.Object3D): FocusFrameResult {
  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);

  const fallback = (): FocusFrameResult => ({
    cameraPosition: [0, FOCUS_FRAME.orbitTargetY + FOCUS_FRAME.cameraHeightOffset, 3.6],
    orbitTarget: [0, FOCUS_FRAME.orbitTargetY, 0],
    minDistance: FOCUS_FRAME.minCameraDistance * FOCUS_FRAME.minZoomFactor,
    maxDistance: FOCUS_FRAME.minCameraDistance * FOCUS_FRAME.maxZoomFactor,
  });

  if (size.lengthSq() < 1e-10) return fallback();

  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const diameter = Math.max(sphere.radius * 2, 1e-4);
  const scale = THREE.MathUtils.clamp(
    FOCUS_FRAME.targetDiameter / diameter,
    FOCUS_FRAME.minScale,
    FOCUS_FRAME.maxScale,
  );
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);

  const pivot = findPivot(root);
  const anchor = new THREE.Vector3();
  if (pivot) {
    pivot.getWorldPosition(anchor);
  } else {
    const box2 = new THREE.Box3().setFromObject(root);
    box2.getCenter(anchor);
  }
  root.position.sub(anchor);
  root.updateMatrixWorld(true);

  const fitted = new THREE.Box3().setFromObject(root);
  const fittedSphere = fitted.getBoundingSphere(new THREE.Sphere());
  const r = Math.max(fittedSphere.radius * FOCUS_FRAME.framePadding, 1e-3);

  const vFov = THREE.MathUtils.degToRad(FOCUS_FRAME.cameraFov);
  const aspect = effectiveViewportAspect();
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect * FOCUS_FRAME.centerWidthFraction);

  const distVertical = r / Math.sin(vFov / 2);
  const distHorizontal = r / Math.sin(hFov / 2);
  const distance = Math.max(distVertical, distHorizontal, FOCUS_FRAME.minCameraDistance);

  const orbitTarget: [number, number, number] = [0, FOCUS_FRAME.orbitTargetY, 0];
  const cameraPosition: [number, number, number] = [
    0,
    FOCUS_FRAME.orbitTargetY + FOCUS_FRAME.cameraHeightOffset,
    distance,
  ];

  return {
    cameraPosition,
    orbitTarget,
    minDistance: distance * FOCUS_FRAME.minZoomFactor,
    maxDistance: distance * FOCUS_FRAME.maxZoomFactor,
  };
}

export function bindFocusButtonActions(
  root: THREE.Object3D,
  buttons: ExhibitManifestItem["buttons"] | undefined,
) {
  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const action = buttons?.[obj.name];
    if (action) obj.userData.focusButtonAction = action;
    else delete obj.userData.focusButtonAction;
  });
}
