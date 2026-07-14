export type DisposableBootRenderer = { dispose: () => void };
export type OwnedBootRendererRef = { current: DisposableBootRenderer | null };
export type RendererLossWatcherRef = { current: (() => void) | null };

export function disposeOwnedBootRenderer(ref: OwnedBootRendererRef) {
  const renderer = ref.current;
  if (!renderer) return false;
  ref.current = null;
  renderer.dispose();
  return true;
}

export function replaceOwnedBootRenderer(
  ref: OwnedBootRendererRef,
  renderer: DisposableBootRenderer,
) {
  if (ref.current === renderer) return;
  disposeOwnedBootRenderer(ref);
  ref.current = renderer;
}

export function replaceWatchedBootRenderer(
  rendererRef: OwnedBootRendererRef,
  watcherRef: RendererLossWatcherRef,
  renderer: DisposableBootRenderer,
) {
  watcherRef.current?.();
  watcherRef.current = null;
  replaceOwnedBootRenderer(rendererRef, renderer);
}
