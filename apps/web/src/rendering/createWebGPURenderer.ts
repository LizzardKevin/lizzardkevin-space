import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { ENABLE_GALLERY_RENDERER_ANTIALIAS } from "../scenes/gallery/galleryConfig";
import {
  initializeCompatibleProfiledRenderer,
  supportsImplicitWebGPUVertexEntryPointForBackend,
  type RendererProfileId,
  type RendererResolution,
} from "./rendererProfile";
import { disposeRendererIfCanvasDetached } from "./rendererLifecycle";

type WebGPUCanvasProps = {
  canvas: HTMLCanvasElement;
  requestedProfile?: RendererProfileId;
  /** Transparent clear for Focus overlay canvas stacked over blurred SPACE. */
  alpha?: boolean;
  onResolved?: (resolution: RendererResolution) => void;
};

export async function createWebGPURenderer(props: WebGPUCanvasProps): Promise<WebGPURenderer> {
  const { renderer, resolution } = await initializeCompatibleProfiledRenderer(
    props.requestedProfile ?? "full",
    (forceWebGL) =>
      new WebGPURenderer({
        canvas: props.canvas,
        antialias: ENABLE_GALLERY_RENDERER_ANTIALIAS,
        alpha: props.alpha ?? false,
        forceWebGL,
      }),
    // Keep this probe device-only. Three r184 does not acquire the canvas WebGPU
    // context until render, so an incompatible renderer can release its device
    // before the same canvas is reused by the forced-WebGL fallback.
    (candidate) => supportsImplicitWebGPUVertexEntryPointForBackend(candidate.backend),
  );

  if (disposeRendererIfCanvasDetached(renderer, props.canvas)) {
    throw new Error("Renderer initialization cancelled because its canvas was unmounted");
  }

  // Tone mapping (game-like highlight compression) + output color space.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  if (props.alpha) {
    renderer.setClearColor(0x000000, 0);
  }
  if (import.meta.env.DEV) {
    console.info(`[Renderer] ${resolution.backend} initialized (${resolution.profile})`);
  }

  props.onResolved?.(resolution);

  return renderer;
}
