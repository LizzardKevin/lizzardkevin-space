import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildExhibitTarget, isExhibitWithinRange, type ExhibitTarget } from "../../exhibits/exhibitTarget";

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
    const tryFocus = () => {
      if (!enabled) return;
      if (suppressNextClickRef.current) {
        onConsumeSuppressedClickRef.current();
        return;
      }
      const id = lastFocused.current;
      if (id) onFocusExhibitRef.current(id);
      else onEmptyClickRef.current();
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      tryFocus();
    };

    // PointerLockControls 可能在冒泡阶段吞事件，这里用 capture 确保能收到输入。
    window.addEventListener("mousedown", onMouseDown, true);
    return () => {
      window.removeEventListener("mousedown", onMouseDown, true);
    };
  }, [enabled, gl.domElement]);

  return null;
}
