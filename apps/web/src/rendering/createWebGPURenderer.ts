import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { logWebGPUAdapterInfo } from "./webgpuSupport";

type WebGPUCanvasProps = {
  canvas: HTMLCanvasElement;
  antialias?: boolean;
  /** Transparent clear for Focus overlay canvas stacked over blurred SPACE. */
  alpha?: boolean;
};

export async function createWebGPURenderer(props: WebGPUCanvasProps): Promise<WebGPURenderer> {
  const renderer = new WebGPURenderer({
    canvas: props.canvas,
    antialias: props.antialias ?? true,
    alpha: props.alpha ?? false,
  });

  await renderer.init();

  // Tone mapping (game-like highlight compression) + output color space.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  if (props.alpha) {
    renderer.setClearColor(0x000000, 0);
  }
  void logWebGPUAdapterInfo();

  if (import.meta.env.DEV) {
    console.info("[WebGPU] renderer initialized");
  }

  return renderer;
}
