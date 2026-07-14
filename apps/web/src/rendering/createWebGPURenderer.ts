import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import {
  initializeProfiledRenderer,
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
  const { renderer, resolution } = await initializeProfiledRenderer(
    props.requestedProfile ?? "full",
    (forceWebGL) =>
      new WebGPURenderer({
        canvas: props.canvas,
        antialias: false,
        alpha: props.alpha ?? false,
        forceWebGL,
      }),
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
