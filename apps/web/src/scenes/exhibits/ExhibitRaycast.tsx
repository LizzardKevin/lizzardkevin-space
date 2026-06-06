import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildExhibitTarget, isExhibitWithinRange, type ExhibitTarget } from "../../exhibits/exhibitTarget";
import { resumeSpaceFirstPersonOnGestureIfPending } from "../../space/requestSpacePointerLock";

export function ExhibitRaycast({
  onTargetChange,
  onFocusExhibit,
  onEmptyClick,
  suppressNextClick,
  onConsumeSuppressedClick,
  enabled,
}: {
  onTargetChange: (target: ExhibitTarget | null) => void;
  onFocusExhibit: (exhibitId: string) => void;
  onEmptyClick: () => void;
  suppressNextClick: boolean;
  onConsumeSuppressedClick: () => void;
  enabled: boolean;
}) {
  const { camera, scene, gl } = useThree();
  const lastActiveId = useRef<string | null>(null);
  const lastFocused = useRef<string | null>(null);
  const onTargetChangeRef = useRef(onTargetChange);
  const onFocusExhibitRef = useRef(onFocusExhibit);
  const onEmptyClickRef = useRef(onEmptyClick);
  const suppressNextClickRef = useRef(suppressNextClick);
  const onConsumeSuppressedClickRef = useRef(onConsumeSuppressedClick);
  onTargetChangeRef.current = onTargetChange;
  onFocusExhibitRef.current = onFocusExhibit;
  onEmptyClickRef.current = onEmptyClick;
  suppressNextClickRef.current = suppressNextClick;
  onConsumeSuppressedClickRef.current = onConsumeSuppressedClick;

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const center = useMemo(() => new THREE.Vector2(0, 0), []);

  useEffect(() => {
    if (enabled) return;
    lastActiveId.current = null;
    lastFocused.current = null;
    onTargetChangeRef.current(null);
  }, [enabled]);

  useFrame(() => {
    if (!enabled) return;
    raycaster.setFromCamera(center, camera);

    const hits = raycaster.intersectObjects(scene.children, true);
    const frontHit = hits[0]?.object as THREE.Object3D | undefined;
    // 射线常命中展品的子 mesh；exhibitId 往往绑定在父级节点上，需要向上冒泡查找。
    let hitObject: THREE.Object3D | null = frontHit ?? null;
    let exhibitId: string | null = null;
    while (hitObject) {
      if (hitObject.userData?.exhibitId != null) {
        exhibitId = String(hitObject.userData.exhibitId);
        break;
      }
      hitObject = hitObject.parent;
    }

    let target: ExhibitTarget | null = null;
    if (exhibitId && hitObject && isExhibitWithinRange(camera, hitObject)) {
      target = buildExhibitTarget(hitObject, exhibitId);
    }

    lastFocused.current = target?.exhibitId ?? null;

    const activeId = target?.exhibitId ?? null;
    if (activeId !== lastActiveId.current) {
      lastActiveId.current = activeId;
      onTargetChangeRef.current(target);
    }
  });

  useEffect(() => {
    const canvas = gl.domElement;
    const eventRoot = canvas.parentElement ?? canvas;

    /** Pointer lock 可能落在 R3F 事件根节点（父 div）而非 canvas 本身。 */
    const isSpaceCanvasInput = (e: PointerEvent) => {
      const lockEl = document.pointerLockElement;
      if (lockEl) {
        return (
          lockEl === canvas ||
          lockEl === eventRoot ||
          lockEl.contains(canvas) ||
          eventRoot.contains(lockEl)
        );
      }
      const target = e.target;
      return (
        (target instanceof Node && (canvas.contains(target) || eventRoot.contains(target))) ||
        target === canvas ||
        target === eventRoot
      );
    };

    const tryFocus = () => {
      if (!enabled) return;
      const id = lastFocused.current;
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        onConsumeSuppressedClickRef.current();
        if (!id) return;
      }
      if (id) onFocusExhibitRef.current(id);
      else onEmptyClickRef.current();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (!isSpaceCanvasInput(e)) return;
      resumeSpaceFirstPersonOnGestureIfPending();
      tryFocus();
    };

    // capture + pointerdown：与 pointer lock 用户手势同帧，且早于 PointerLockControls 的 document click。
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [enabled, gl.domElement]);

  return null;
}
