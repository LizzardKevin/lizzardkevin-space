type DisposableRenderer = { dispose: () => void };
type CanvasConnection = { isConnected: boolean };

export function createPendingRendererInitialization<Renderer>(): Promise<Renderer> {
  return new Promise<Renderer>(() => undefined);
}

export function reportRendererInitializationErrorIfMounted(
  isMounted: () => boolean,
  reportError: (error: unknown) => void,
  error: unknown,
) {
  if (!isMounted()) return false;
  reportError(error);
  return true;
}

export function disposeRendererIfCanvasDetached(
  renderer: DisposableRenderer,
  canvas: CanvasConnection,
) {
  if (canvas.isConnected) return false;
  renderer.dispose();
  return true;
}

export function bridgeRendererInitialization<Renderer>(
  initialization: Promise<Renderer>,
  onError: (error: unknown) => void,
): Promise<Renderer> {
  return initialization.catch((error) => {
    try {
      onError(error);
    } catch {
      // The bridge must keep R3F pending even if an error reporter itself fails.
    }
    return createPendingRendererInitialization<Renderer>();
  });
}
