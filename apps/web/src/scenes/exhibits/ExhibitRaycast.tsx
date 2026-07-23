import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildExhibitTarget, isExhibitWithinRange, type ExhibitTarget } from "../../exhibits/exhibitTarget";
import { isPendingEscapePointerLockRecovery } from "../../space/requestSpacePointerLock";
import { findSceneExhibitRoot } from "./exhibitPlacement.ts";
import { useExhibitInteractionTargets } from "./exhibitInteractionRegistry";
import { publishSpaceRaycastDebug } from "../debug/spaceMovementDebug";

const EXHIBIT_INTERACTION_RAYCAST_FAR = 30;
/** 遮挡判定的距离容差（米）：遮挡物须比展品命中更近这么多才算阻挡。 */
const OCCLUSION_EPSILON = 0.05;

/** 收集场景中的 COL_ 碰撞网格（不可见但可被 Raycaster 命中），作为交互遮挡物。 */
function collectCollisionMeshes(scene: THREE.Scene, cache: THREE.Mesh[] | null): THREE.Mesh[] {
  if (cache && cache.length > 0) return cache;
  const meshes: THREE.Mesh[] = [];
  scene.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh && obj.name.startsWith("COL_")) {
      meshes.push(obj as THREE.Mesh);
    }
  });
  return meshes;
}

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
  const { camera, gl, scene } = useThree();
  const interactionTargets = useExhibitInteractionTargets();
  const lastActiveKey = useRef<string | null>(null);
  const lastFocused = useRef<string | null>(null);
  const collisionMeshesRef = useRef<THREE.Mesh[]>([]);
  const onTargetChangeRef = useRef(onTargetChange);
  const onFocusExhibitRef = useRef(onFocusExhibit);
  const onEmptyClickRef = useRef(onEmptyClick);
  const suppressNextClickRef = useRef(suppressNextClick);
  const onConsumeSuppressedClickRef = useRef(onConsumeSuppressedClick);

  useEffect(() => {
    onTargetChangeRef.current = onTargetChange;
    onFocusExhibitRef.current = onFocusExhibit;
    onEmptyClickRef.current = onEmptyClick;
    suppressNextClickRef.current = suppressNextClick;
    onConsumeSuppressedClickRef.current = onConsumeSuppressedClick;
  }, [
    onTargetChange,
    onFocusExhibit,
    onEmptyClick,
    suppressNextClick,
    onConsumeSuppressedClick,
  ]);

  const raycaster = useMemo(() => {
    const caster = new THREE.Raycaster();
    caster.near = 0;
    caster.far = EXHIBIT_INTERACTION_RAYCAST_FAR;
    return caster;
  }, []);
  const center = useMemo(() => new THREE.Vector2(0, 0), []);
  const lastDebugHitMeshName = useRef<string | null>(null);

  useEffect(() => {
    if (enabled) return;
    lastActiveKey.current = null;
    lastFocused.current = null;
    onTargetChangeRef.current(null);
  }, [enabled]);

  useFrame(() => {
    if (!enabled) return;
    if (interactionTargets.length === 0) {
      if (lastActiveKey.current !== null) {
        lastActiveKey.current = null;
        lastFocused.current = null;
        onTargetChangeRef.current(null);
      }
      return;
    }
    raycaster.setFromCamera(center, camera);

    const hits = raycaster.intersectObjects(interactionTargets, true);
    let frontHit = hits[0]?.object as THREE.Object3D | undefined;

    // 遮挡判定：射线必须先命中场景碰撞网格（COL_）才算被阻挡——
    // 隔墙/隔物时即使准星对着展品（含投影仪）也不触发提示与交互。
    if (frontHit) {
      if (collisionMeshesRef.current.length === 0) {
        collisionMeshesRef.current = collectCollisionMeshes(scene, collisionMeshesRef.current);
      }
      if (collisionMeshesRef.current.length > 0) {
        const blockers = raycaster.intersectObjects(collisionMeshesRef.current, false);
        const blocker = blockers[0];
        if (blocker && blocker.distance < hits[0].distance - OCCLUSION_EPSILON) {
          frontHit = undefined;
        }
      }
    }

    if (import.meta.env.DEV) {
      const debugHit = frontHit;
      const hitMeshName = debugHit ? debugHit.name || debugHit.parent?.name || debugHit.uuid : null;
      if (hitMeshName !== lastDebugHitMeshName.current) {
        lastDebugHitMeshName.current = hitMeshName;
        publishSpaceRaycastDebug({
          timestamp: performance.now(),
          hitMeshName,
        });
      }
    }
    // 射线常命中展品的子 mesh；exhibitId 往往绑定在父级节点上，需要向上冒泡查找。
    let hitObject: THREE.Object3D | null = frontHit ?? null;
    let exhibitId: string | null = null;
    while (hitObject) {
      if (hitObject.userData?.exhibitId != null) {
        exhibitId = String(hitObject.userData.exhibitId);
        hitObject = findSceneExhibitRoot(hitObject, exhibitId);
        break;
      }
      hitObject = hitObject.parent;
    }

    let target: ExhibitTarget | null = null;
    if (exhibitId && hitObject && isExhibitWithinRange(camera, hitObject)) {
      target = buildExhibitTarget(hitObject, exhibitId);
    }

    lastFocused.current = target?.exhibitId ?? null;

    const activeKey = target
      ? `${target.exhibitId}:${target.interactionKind}:${target.object.uuid}`
      : null;
    if (activeKey !== lastActiveKey.current) {
      lastActiveKey.current = activeKey;
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
      // ESC 回 SPACE 后指针锁恢复前：吞掉左键，避免误进作品详情
      if (isPendingEscapePointerLockRecovery()) return;
      const id = lastFocused.current;
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        onConsumeSuppressedClickRef.current();
        return;
      }
      if (id) onFocusExhibitRef.current(id);
      else onEmptyClickRef.current();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (!isSpaceCanvasInput(e)) return;
      tryFocus();
    };

    // capture + pointerdown：先解析展品交互；pointer lock 只由 GuardedPointerLockControls 的 click owner 请求。
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [enabled, gl.domElement]);

  return null;
}
