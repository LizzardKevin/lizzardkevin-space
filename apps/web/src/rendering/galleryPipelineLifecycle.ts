type Disposable = {
  dispose: () => void;
};

type OwnedRttTextureNode = {
  renderTarget?: Disposable | null;
  _quadMesh?: { material?: Disposable | null } | null;
};

export type GalleryPipelineResources = {
  pipeline: Disposable;
  scenePass: Disposable;
  bloomNode?: Disposable | null;
  fxaaInput?: OwnedRttTextureNode | null;
};

/** Dispose every GPU allocation created outside RenderPipeline itself. */
export function disposeGalleryPipelineResources(resources: GalleryPipelineResources): void {
  resources.pipeline.dispose();
  resources.fxaaInput?._quadMesh?.material?.dispose();
  resources.fxaaInput?.renderTarget?.dispose();
  resources.bloomNode?.dispose();
  resources.scenePass.dispose();
}
