import { useRef } from "react";
import { detectClientPlatform, type ClientPlatform } from "./clientPlatform";

/** 会话内固定平台，避免横竖屏/外接输入导致分支抖动 */
export function useClientPlatform(): ClientPlatform {
  const ref = useRef<ClientPlatform | null>(null);
  if (ref.current === null) {
    ref.current = detectClientPlatform();
  }
  return ref.current;
}
