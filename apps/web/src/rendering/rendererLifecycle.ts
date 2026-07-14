type DisposableRenderer = { dispose: () => void };
type CanvasConnection = { isConnected: boolean };

const PENDING_RENDERER_INITIALIZATION = new Promise<never>(() => undefined);

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
    return PENDING_RENDERER_INITIALIZATION;
  });
}
