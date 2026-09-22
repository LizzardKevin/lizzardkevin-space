import { InstancedBufferAttribute, Sprite } from 'three';
import { PointsNodeMaterial } from 'three/webgpu';
import { cos, exp, float, instancedBufferAttribute, mix, sin, smoothstep, uniform, uv, varying, vec2, vec3, vec4 } from 'three/tsl';
import type { ProfileUniforms } from './profileParticleMaterial.ts';
import { CULTURAL, culturalAngle, culturalCycle, culturalExtent, culturalFit, culturalVerticalOffset, type CulturalScene } from './profileCultural.ts';
import { mulberry32 } from '../seededRandom.ts';

export class ProfileCulturalCloud {
  readonly points:Sprite;
  private clock=0;
  private index=-1;
  private readonly from=new InstancedBufferAttribute(new Float32Array(CULTURAL.count*3),3);
  private readonly to=new InstancedBufferAttribute(new Float32Array(CULTURAL.count*3),3);
  private readonly colorA=new InstancedBufferAttribute(new Float32Array(CULTURAL.count*4),4);
  private readonly colorB=new InstancedBufferAttribute(new Float32Array(CULTURAL.count*4),4);
  private readonly phase=uniform(0);
  private readonly angle=uniform(0);
  private readonly nextAngle=uniform(0);
  private readonly visibility=uniform(0);
  private readonly time=uniform(0);
  private readonly fit=uniform(1);
  private readonly relief=uniform(0);
  private readonly verticalOffset=uniform(0);
  private readonly extents:[number,number][];
  private readonly uniforms:ProfileUniforms;
  private readonly scenes:CulturalScene[];
  constructor(scenes:CulturalScene[],u:ProfileUniforms){
    this.scenes=scenes;
    this.uniforms=u;this.extents=scenes.map(culturalExtent);
    const a=instancedBufferAttribute<'vec3'>(this.from,'vec3'),b=instancedBufferAttribute<'vec3'>(this.to,'vec3');
    const ca=instancedBufferAttribute<'vec4'>(this.colorA,'vec4'),cb=instancedBufferAttribute<'vec4'>(this.colorB,'vec4');
    const random=mulberry32(0x63756c74),seeds=new Float32Array(CULTURAL.count*3);
    for(let i=0;i<seeds.length;i++)seeds[i]=random()*2-1;
    const noise=instancedBufferAttribute<'vec3'>(new InstancedBufferAttribute(seeds,3),'vec3');
    const rotate=(p:typeof a,theta:typeof this.angle)=>vec3(p.x.mul(cos(theta)).add(p.z.mul(sin(theta))),p.y,p.z.mul(cos(theta)).sub(p.x.mul(sin(theta))));
    const local=mix(rotate(a,this.angle),rotate(b,this.nextAngle),this.phase)
      .add(noise.mul(sin(this.phase.mul(Math.PI))).mul(CULTURAL.localScatter));
    const world=local.add(vec3(...CULTURAL.center));
    const v=u.viewA.mul(vec4(world,1)).xyz;
    const projected=vec3(v.x.mul(u.projectionA.x).add(v.z.mul(u.projectionA.z)).div(u.fixedProjection.x),
      v.y.mul(u.projectionA.y).add(v.z.mul(u.projectionA.w)).div(u.fixedProjection.y),v.z);
    const position=vec3(projected.xy.mul(this.fit),projected.z).add(vec3(
      v.z.negate().mul(u.offset.mul(.5)).mul(this.relief.oneMinus()).div(u.fixedProjection.x),
      sin(this.time.mul(.43)).mul(.003).add(v.z.negate().mul(this.verticalOffset).div(u.fixedProjection.y)),0));
    const depth=position.z.negate().max(.005),ndc=position.xy.mul(u.fixedProjection).div(depth);
    const d=ndc.sub(u.cursor).mul(vec2(u.aspect,1)).length().div(.45);
    const glow=exp(d.mul(d).mul(-4.5)).mul(smoothstep(float(.65),float(1),d).oneMinus());
    const material=new PointsNodeMaterial();
    material.positionNode=position.add(noise.mul(glow).mul(.005));
    const color=mix(ca,cb,this.phase);
    const screenFeather=smoothstep(float(.68),float(1),ndc.x.abs()).oneMinus()
      .mul(smoothstep(float(.68),float(1),ndc.y.abs()).oneMinus());
    const alpha=color.a.mul(mix(float(1),screenFeather,this.relief));
    material.sizeNode=depth.mul(3.2).div(u.height).mul(this.visibility).mul(glow.mul(.15).add(1)).mul(alpha.sqrt());
    material.colorNode=varying(color.rgb.mul(.9).add(.035).add(glow.mul(.12)).mul(alpha.sqrt()));
    material.opacityNode=smoothstep(float(.3),float(.5),uv().sub(vec2(.5)).length()).oneMinus().mul(varying(alpha)).mul(this.visibility);
    material.alphaTest=.001;material.alphaToCoverage=true;material.transparent=false;material.depthWrite=true;
    this.points=new Sprite(material);this.points.geometry=this.points.geometry.clone();this.points.count=CULTURAL.count;this.points.frustumCulled=false;
    this.update(0,4);
  }
  update(dt:number,cameraProgress:number){
    const ease=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
    const visible=ease(3.55,3.95,cameraProgress)*(1-ease(4.05,4.4,cameraProgress));
    this.visibility.value=visible;this.points.visible=visible>0;
    if(visible<=0)return;
    this.clock+=dt;this.time.value=this.clock;
    const state=culturalCycle(this.clock);
    const a=culturalFit(this.extents[state.index],this.uniforms.aspect.value,state.index),b=culturalFit(this.extents[state.next],this.uniforms.aspect.value,state.next);
    this.fit.value=a+(b-a)*state.morph;
    const offsetA=culturalVerticalOffset(this.extents[state.index],a,state.index),offsetB=culturalVerticalOffset(this.extents[state.next],b,state.next);
    this.verticalOffset.value=offsetA+(offsetB-offsetA)*state.morph;
    this.relief.value=(state.index===0?0:1)*(1-state.morph)+(state.next===0?0:1)*state.morph;
    if(state.index!==this.index){
      this.index=state.index;
      for(const [scene,position,color] of [[this.scenes[state.index],this.from,this.colorA],[this.scenes[state.next],this.to,this.colorB]] as const){
        position.array.set(scene.positions);
        for(let i=0;i<scene.colors.length;i++)color.array[i]=scene.colors[i]/255;
        position.needsUpdate=true;color.needsUpdate=true;
      }
    }
    this.phase.value=state.morph;this.angle.value=state.angle;
    this.nextAngle.value=-culturalAngle(state.next)/2;
  }
  getState(){return {...culturalCycle(this.clock),time:this.clock,visible:this.visibility.value};}
  dispose(){this.points.geometry.dispose();this.points.material.dispose();}
}
