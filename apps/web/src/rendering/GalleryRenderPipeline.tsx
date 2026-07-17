import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { RenderPipeline, WebGPURenderer } from "three/webgpu";
import { clamp, color, float, length, mix, pass, renderOutput, saturation, smoothstep, uv, vec2, vec3, vec4 } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { fxaa } from "three/addons/tsl/display/FXAANode.js";
import {
  ENABLE_GALLERY_COLOR_GRADE,
  ENABLE_GALLERY_FXAA,
  ENABLE_GALLERY_VIGNETTE,
  GALLERY_COLOR_GRADE,
  GALLERY_VIGNETTE,
} from "../scenes/gallery/galleryConfig";
import type { SpaceQualityConfig } from "../space/spaceVisualSettings";
import {
  disposeGalleryPipelineResources,
  type GalleryPipelineResources,
} from "./galleryPipelineLifecycle";

type PostFxContext = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  sceneColor: ReturnType<ReturnType<typeof pass>["getTextureNode"]>;
  toneMapping: THREE.ToneMapping;
  outputColorSpace: THREE.ColorSpace;
};

type TslColorNode = ReturnType<typeof vec4>;
type BloomConfig = SpaceQualityConfig["post"]["bloom"];
type BloomNode = ReturnType<typeof bloom> & { dispose: () => void };
type FxaaInputNode = GalleryPipelineResources["fxaaInput"];

function buildPostFxOutput(
  ctx: PostFxContext,
  bloomConfig: BloomConfig,
  owned: Pick<GalleryPipelineResources, "bloomNode" | "fxaaInput">,
) {
  let out = ctx.sceneColor as unknown as TslColorNode;

  if (ENABLE_GALLERY_COLOR_GRADE) {
    const bright = out.rgb.mul(float(GALLERY_COLOR_GRADE.brightness));
    const contrasted = bright.sub(vec3(0.5)).mul(float(GALLERY_COLOR_GRADE.contrast)).add(vec3(0.5));
    const saturated = saturation(contrasted, float(GALLERY_COLOR_GRADE.saturation));
    const tinted = mix(saturated, saturated.mul(color(GALLERY_COLOR_GRADE.tint)), float(GALLERY_COLOR_GRADE.tintStrength));
    out = vec4(clamp(tinted, vec3(0), vec3(1)), out.a);
  }

  if (bloomConfig.enabled) {
    const bloomNode = bloom(
      ctx.sceneColor,
      bloomConfig.strength,
      bloomConfig.radius,
      bloomConfig.threshold,
    ) as BloomNode;
    owned.bloomNode = bloomNode;
    out = out.add(bloomNode) as unknown as TslColorNode;
  }

  if (ENABLE_GALLERY_VIGNETTE) {
    // Lightweight vignette in TSL (no extra passes).
    const p = uv().sub(vec2(0.5, 0.5)).mul(float(2.0));
    const r = length(p);
    const v = smoothstep(float(GALLERY_VIGNETTE.inner), float(GALLERY_VIGNETTE.outer), r);
    const darken = float(1.0).sub(v.mul(float(GALLERY_VIGNETTE.strength)));
    out = out.mul(vec4(vec3(darken), 1.0)) as unknown as TslColorNode;
  }

  if (ENABLE_GALLERY_FXAA) {
    // FXAA expects display-referred sRGB input. RenderPipeline normally applies
    // this transform after outputNode, so do it explicitly before FXAA instead.
    out = renderOutput(out, ctx.toneMapping, ctx.outputColorSpace) as unknown as TslColorNode;
    const fxaaNode = fxaa(out);
    // fxaa() converts non-texture input to an owned RTT node. Three's
    // RenderPipeline.dispose() does not release that target or quad material.
    owned.fxaaInput = fxaaNode.textureNode as unknown as FxaaInputNode;
    out = fxaaNode as unknown as TslColorNode;
  }

  return out;
}

/**
 * WebGPU RenderPipeline (Firewatch stack: BaseScene → Bloom → HUD/Overlays).
 * When all post FX are off, skips priority render so R3F default draw shows base colors.
 */
export function GalleryRenderPipeline({ bloom: bloomConfig }: { bloom: BloomConfig }) {
  const gl = useThree((state) => state.gl as unknown as WebGPURenderer);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const pipelineRef = useRef<RenderPipeline | null>(null);
  const bloomEnabled = bloomConfig.enabled;
  const bloomRadius = bloomConfig.radius;
  const bloomStrength = bloomConfig.strength;
  const bloomThreshold = bloomConfig.threshold;
  const postFxEnabled = bloomEnabled || ENABLE_GALLERY_COLOR_GRADE || ENABLE_GALLERY_VIGNETTE || ENABLE_GALLERY_FXAA;

  useLayoutEffect(() => {
    if (!postFxEnabled) {
      pipelineRef.current = null;
      return;
    }

    const pipeline = new RenderPipeline(gl);
    // FXAA already receives an explicitly transformed display-color node above.
    // Avoid applying tone mapping/output color conversion a second time.
    pipeline.outputColorTransform = !ENABLE_GALLERY_FXAA;
    // Full uses FXAA. Keep the expensive scene render single-sampled instead of
    // inheriting renderer MSAA (which remains enabled for simplified/fallback).
    const scenePass = pass(scene, camera, { samples: ENABLE_GALLERY_FXAA ? 0 : undefined });

    const sceneColor = scenePass.getTextureNode("output");
    const owned: Pick<GalleryPipelineResources, "bloomNode" | "fxaaInput"> = {};

    pipeline.outputNode = buildPostFxOutput(
      {
        scene,
        camera,
        sceneColor,
        toneMapping: gl.toneMapping,
        outputColorSpace: gl.outputColorSpace as THREE.ColorSpace,
      },
      {
        enabled: bloomEnabled,
        radius: bloomRadius,
        strength: bloomStrength,
        threshold: bloomThreshold,
      },
      owned,
    );
    pipeline.needsUpdate = true;
    pipelineRef.current = pipeline;

    return () => {
      disposeGalleryPipelineResources({
        pipeline,
        scenePass,
        bloomNode: owned.bloomNode,
        fxaaInput: owned.fxaaInput,
      });
      pipelineRef.current = null;
    };
  }, [
    gl,
    scene,
    camera,
    postFxEnabled,
    bloomEnabled,
    bloomRadius,
    bloomStrength,
    bloomThreshold,
  ]);

  useFrame(() => {
    if (!postFxEnabled) return;
    pipelineRef.current?.render();
  }, postFxEnabled ? 1 : 0);

  return null;
}
