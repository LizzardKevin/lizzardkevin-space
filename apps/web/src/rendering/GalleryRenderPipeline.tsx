import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { RenderPipeline, WebGPURenderer } from "three/webgpu";
import { clamp, color, float, length, mix, pass, saturation, smoothstep, uv, vec2, vec3, vec4 } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import {
  ENABLE_GALLERY_COLOR_GRADE,
  ENABLE_GALLERY_VIGNETTE,
  GALLERY_COLOR_GRADE,
  GALLERY_VIGNETTE,
} from "../scenes/gallery/galleryConfig";
import type { SpaceQualityConfig } from "../space/spaceVisualSettings";

type PostFxContext = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  sceneColor: ReturnType<ReturnType<typeof pass>["getTextureNode"]>;
};

type TslColorNode = ReturnType<typeof vec4>;
type BloomConfig = SpaceQualityConfig["post"]["bloom"];
type MotionBlurConfig = SpaceQualityConfig["post"]["motionBlur"];

function buildPostFxOutput(ctx: PostFxContext, bloomConfig: BloomConfig) {
  let out = ctx.sceneColor as unknown as TslColorNode;

  if (ENABLE_GALLERY_COLOR_GRADE) {
    const bright = out.rgb.mul(float(GALLERY_COLOR_GRADE.brightness));
    const contrasted = bright.sub(vec3(0.5)).mul(float(GALLERY_COLOR_GRADE.contrast)).add(vec3(0.5));
    const saturated = saturation(contrasted, float(GALLERY_COLOR_GRADE.saturation));
    const tinted = mix(saturated, saturated.mul(color(GALLERY_COLOR_GRADE.tint)), float(GALLERY_COLOR_GRADE.tintStrength));
    out = vec4(clamp(tinted, vec3(0), vec3(1)), out.a);
  }

  if (bloomConfig.enabled) {
    out = out.add(
      bloom(ctx.sceneColor, bloomConfig.strength, bloomConfig.radius, bloomConfig.threshold),
    ) as unknown as TslColorNode;
  }

  if (ENABLE_GALLERY_VIGNETTE) {
    // Lightweight vignette in TSL (no extra passes).
    const p = uv().sub(vec2(0.5, 0.5)).mul(float(2.0));
    const r = length(p);
    const v = smoothstep(float(GALLERY_VIGNETTE.inner), float(GALLERY_VIGNETTE.outer), r);
    const darken = float(1.0).sub(v.mul(float(GALLERY_VIGNETTE.strength)));
    out = out.mul(vec4(vec3(darken), 1.0)) as unknown as TslColorNode;
  }

  return out;
}

/**
 * WebGPU RenderPipeline (Firewatch stack: BaseScene → Bloom → HUD/Overlays).
 * When all post FX are off, skips priority render so R3F default draw shows base colors.
 */
export function GalleryRenderPipeline({
  bloom: bloomConfig,
  motionBlur: motionBlurConfig,
}: {
  bloom: BloomConfig;
  motionBlur: MotionBlurConfig;
}) {
  const gl = useThree((state) => state.gl as unknown as WebGPURenderer);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const pipelineRef = useRef<RenderPipeline | null>(null);
  const bloomEnabled = bloomConfig.enabled;
  const bloomRadius = bloomConfig.radius;
  const bloomStrength = bloomConfig.strength;
  const bloomThreshold = bloomConfig.threshold;
  const motionBlurEnabled = motionBlurConfig.enabled;
  const postFxEnabled = bloomEnabled || motionBlurEnabled || ENABLE_GALLERY_COLOR_GRADE || ENABLE_GALLERY_VIGNETTE;

  useLayoutEffect(() => {
    if (!postFxEnabled) {
      pipelineRef.current = null;
      return;
    }

    const pipeline = new RenderPipeline(gl);
    const scenePass = pass(scene, camera);

    const sceneColor = scenePass.getTextureNode("output");

    pipeline.outputNode = buildPostFxOutput(
      { scene, camera, sceneColor },
      {
        enabled: bloomEnabled,
        radius: bloomRadius,
        strength: bloomStrength,
        threshold: bloomThreshold,
      },
    );
    pipeline.needsUpdate = true;
    pipelineRef.current = pipeline;

    return () => {
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
    motionBlurEnabled,
  ]);

  useLayoutEffect(() => {
    if (!postFxEnabled) return;
    const pipeline = pipelineRef.current;
    if (!pipeline) return;
    pipeline.needsUpdate = true;
  }, [postFxEnabled, size.width, size.height]);

  useFrame(() => {
    if (!postFxEnabled) return;
    pipelineRef.current?.render();
  }, postFxEnabled ? 1 : 0);

  return null;
}
