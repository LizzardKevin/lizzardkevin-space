export function disposeOwnedRenderPipeline(pipeline: { dispose: () => void }) {
  pipeline.dispose();
}
