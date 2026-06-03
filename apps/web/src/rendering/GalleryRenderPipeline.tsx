import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { RenderPipeline, WebGPURenderer } from "three/webgpu";
import { float, length, pass, smoothstep, uv, vec2, vec3, vec4 } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import {
  ENABLE_GALLERY_BLOOM,
  ENABLE_GALLERY_VIGNETTE,
  GALLERY_BLOOM,
  GALLERY_VIGNETTE,
} from "../scenes/gallery/galleryConfig";

const POST_FX_ENABLED = ENABLE_GALLERY_BLOOM || ENABLE_GALLERY_VIGNETTE;

type PostFxContext = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  sceneColor: ReturnType<ReturnType<typeof pass>["getTextureNode"]>;
};

function buildPostFxOutput(ctx: PostFxContext) {
  let out = ctx.sceneColor as typeof ctx.sceneColor;

  if (ENABLE_GALLERY_BLOOM) {
    out = out.add(
      bloom(ctx.sceneColor, GALLERY_BLOOM.strength, GALLERY_BLOOM.radius, GALLERY_BLOOM.threshold),
    ) as typeof out;
  }

  if (ENABLE_GALLERY_VIGNETTE) {
    // Lightweight vignette in TSL (no extra passes).
    const p = uv().sub(vec2(0.5, 0.5)).mul(float(2.0));
    const r = length(p);
    const v = smoothstep(float(GALLERY_VIGNETTE.inner), float(GALLERY_VIGNETTE.outer), r);
    const darken = float(1.0).sub(v.mul(float(GALLERY_VIGNETTE.strength)));
    out = out.mul(vec4(vec3(darken), 1.0)) as typeof out;
  }

  return out;
}

/**
 * WebGPU RenderPipeline (Firewatch stack: BaseScene → Bloom → HUD/Overlays).
 * When all post FX are off, skips priority render so R3F default draw shows base colors.
 */
export function GalleryRenderPipeline() {
  const gl = useThree((state) => state.gl as unknown as WebGPURenderer);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const pipelineRef = useRef<RenderPipeline | null>(null);

  useLayoutEffect(() => {
    if (!POST_FX_ENABLED) {
      pipelineRef.current = null;
      return;
    }

    const pipeline = new RenderPipeline(gl);
    const scenePass = pass(scene, camera);

    const sceneColor = scenePass.getTextureNode("output");

    pipeline.outputNode = buildPostFxOutput({ scene, camera, sceneColor });
    pipeline.needsUpdate = true;
    pipelineRef.current = pipeline;

    return () => {
      pipelineRef.current = null;
    };
  }, [gl, scene, camera]);

  useLayoutEffect(() => {
    if (!POST_FX_ENABLED) return;
    const pipeline = pipelineRef.current;
    if (!pipeline) return;
    pipeline.needsUpdate = true;
  }, [size.width, size.height]);

  useFrame(() => {
    if (!POST_FX_ENABLED) return;
    pipelineRef.current?.render();
  }, POST_FX_ENABLED ? 1 : 0);

  return null;
}
