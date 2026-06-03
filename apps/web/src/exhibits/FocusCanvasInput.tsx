import { useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { FOCUS_DOUBLE_CLICK_MS } from "./focusConfig";

/** 双击未命中模型时退出；滚轮缩放仍由 OrbitControls 处理。 */
export function FocusDoubleClickExit({
  hitRoot,
  enabled,
  onBlankDoubleClick,
}: {
  hitRoot: RefObject<THREE.Object3D | null>;
  enabled: boolean;
  onBlankDoubleClick: () => void;
}) {
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pointer = useMemo(() => new THREE.Vector2(), []);
  const onBlankRef = useRef(onBlankDoubleClick);
  onBlankRef.current = onBlankDoubleClick;

  useEffect(() => {
    const el = gl.domElement;
    let lastClickAt = 0;
    const onClick = (e: MouseEvent) => {
      if (!enabled) return;
      const root = hitRoot.current;
      if (!root) return;
      const rect = el.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(root, true);
      if (hits.length > 0) {
        lastClickAt = 0;
        return;
      }
      const now = performance.now();
      if (lastClickAt > 0 && now - lastClickAt <= FOCUS_DOUBLE_CLICK_MS) {
        lastClickAt = 0;
        onBlankRef.current();
        return;
      }
      lastClickAt = now;
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [camera, enabled, gl.domElement, hitRoot, pointer, raycaster]);

  return null;
}
