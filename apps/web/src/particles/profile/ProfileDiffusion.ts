import { RenderPipeline, type WebGPURenderer } from 'three/webgpu';
import { pass, vec3, vec4 } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import type { Camera, Scene } from 'three';
import { PROFILE_DIFFUSION } from './profileAtmosphere.ts';

/** One restrained highlight diffusion pass for the card and all particle scenes. */
export class ProfileDiffusion {
  private readonly pipeline:RenderPipeline;
  private readonly scenePass:ReturnType<typeof pass>;
  private readonly bloomNode:ReturnType<typeof bloom>;
  constructor(renderer:WebGPURenderer,scene:Scene,camera:Camera){
    this.pipeline=new RenderPipeline(renderer);
    this.scenePass=pass(scene,camera);
    const original=this.scenePass.getTextureNode('output');
    this.bloomNode=bloom(original,PROFILE_DIFFUSION.strength,PROFILE_DIFFUSION.radius,PROFILE_DIFFUSION.threshold);
    const halo=this.bloomNode.rgb;
    // Transparent clear needs bloom coverage too; HTML text stays outside the pass.
    const coverage=original.a.max(halo.dot(vec3(.2126,.7152,.0722)).clamp(0,1));
    // Both canvas backends use premultiplied alpha. Preserve the resolved light;
    // dividing by tiny halo coverage would turn a mild glow into a white veil.
    this.pipeline.outputNode=vec4(original.rgb.add(halo),coverage);
  }
  render(){this.pipeline.render();}
  dispose(){this.pipeline.dispose();this.bloomNode.dispose();this.scenePass.dispose();}
}
