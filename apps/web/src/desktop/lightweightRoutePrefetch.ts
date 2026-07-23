import { createIdleRoutePrefetchController } from "./idleRoutePrefetch";

function resolveIdleApi() {
  if (
    typeof window === "undefined" ||
    typeof window.requestIdleCallback !== "function" ||
    typeof window.cancelIdleCallback !== "function"
  ) {
    return null;
  }

  return {
    request: (callback: () => void) => window.requestIdleCallback(() => callback()),
    cancel: (handle: number) => window.cancelIdleCallback(handle),
  };
}

export const lightweightDesktopRoutePrefetch = createIdleRoutePrefetchController({
  idleApi: resolveIdleApi(),
  importers: [() => import("../pages/archive/ArchiveHub")],
});
