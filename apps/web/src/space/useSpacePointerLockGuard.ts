import { useLayoutEffect } from "react";
import { releaseSpacePointerLock } from "./requestSpacePointerLock";

export function shouldGuardSpacePointerLock(
  entered: boolean,
  routeBlocked: boolean,
  returningToSpace: boolean,
  enteringSpace = false,
) {
  return (!entered && !enteringSpace) || (routeBlocked && !returningToSpace);
}

/** Overlay / Focus UI 模式下禁止 pointer lock，避免鼠标被藏起却无法操作。 */
export function useSpacePointerLockGuard(blockPointerLock: boolean) {
  useLayoutEffect(() => {
    if (!blockPointerLock) return;
    releaseSpacePointerLock();
    const onChange = () => {
      if (document.pointerLockElement) releaseSpacePointerLock();
    };
    document.addEventListener("pointerlockchange", onChange);
    return () => document.removeEventListener("pointerlockchange", onChange);
  }, [blockPointerLock]);
}
