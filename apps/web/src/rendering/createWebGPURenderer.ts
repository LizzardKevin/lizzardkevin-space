import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { ENABLE_GALLERY_RENDERER_ANTIALIAS } from "../scenes/gallery/galleryConfig";
import {
  initializeCompatibleProfiledRenderer,
  supportsImplicitWebGPUVertexEntryPoint,
  type RendererProfileId,
  type RendererResolution,
  type WebGPUEntryPointProbeDevice,
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
    (candidate) => {
      const device = (candidate.backend as { device?: WebGPUEntryPointProbeDevice }).device;
      return device ? supportsImplicitWebGPUVertexEntryPoint(device) : true;
    },
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
