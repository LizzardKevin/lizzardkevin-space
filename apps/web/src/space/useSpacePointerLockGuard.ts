import { useEffect } from "react";
import { releaseSpacePointerLock } from "./requestSpacePointerLock";

/** Overlay / Focus UI 模式下禁止 pointer lock，避免鼠标被藏起却无法操作。 */
export function useSpacePointerLockGuard(blockPointerLock: boolean) {
  useEffect(() => {
    if (!blockPointerLock) return;
    releaseSpacePointerLock();
    const onChange = () => {
      if (document.pointerLockElement) releaseSpacePointerLock();
    };
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, [blockPointerLock]);
}
