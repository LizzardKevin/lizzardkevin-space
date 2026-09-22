import { InstancedBufferAttribute, InstancedInterleavedBuffer, Sprite } from 'three';
import { PointsNodeMaterial } from 'three/webgpu';
import { Fn, Loop, cos, exp, exp2, float, instancedBufferAttribute, mix, sin, smoothstep, uniform, uv, varying, vec2, vec3, vec4 } from 'three/tsl';
import type { ProfileUniforms } from './profileParticleMaterial.ts';
import { createProfileCardGrid, PROFILE_HALFTONE } from './profileAtmosphere.ts';
import { PROFILE_CARD_POINTER, profileCardTargets, profileFlightHandoff } from './profileCardFlight.ts';
import { profileParticleMotionNode } from './profileParticleMotionNode.ts';
import type { ProfileParticleArrays } from './profileParticleArrays.ts';
import type { ProfileShot } from './profileCache.ts';
import { PROFILE_BREATH } from './profileSceneDecorations.ts';

/** @lizzardkevin / OpenShaders, https://openshaders.com/@lizzardkevin
 * Port of the user's supplied WGSL field. Same 81 folds, warps and OKLCH palette.
 * Evaluate once per phosphor dot in the vertex stage, not 81 times per pixel.
 * TSL keeps the existing WebGPU / WebGL2 renderer and lifecycle in charge.
 */
export class ProfileCardField {
  readonly points:Sprite;
  private readonly coordinates=new InstancedBufferAttribute(new Float32Array(PROFILE_HALFTONE.maxDots*2),2);
  private readonly spacing=uniform(4.4);
  private readonly visibility=uniform(1);
  private readonly flight=uniform(0);
  private readonly endpoint=uniform(0);
  // One interleaved allocation keeps both endpoints below WebGPU's 8-buffer limit.
  private readonly targetBuffer=new InstancedInterleavedBuffer(new Float32Array(PROFILE_HALFTONE.maxDots*40),40);
  private source:ProfileParticleArrays|undefined;
  private shots:ProfileShot[]=[];
  private dotCount=0;
  private width=0;
  private height=0;

  constructor(u:ProfileUniforms){
    const grid=instancedBufferAttribute<'vec2'>(this.coordinates,'vec2');
    const attributes=Array.from({length:2},(_,end)=>Array.from({length:5},(_,channel)=>instancedBufferAttribute<'vec4'>(this.targetBuffer,'vec4',40,end*20+channel*4)));
    const [target,ma,mb,control,seed]=attributes[0].map((value,i)=>mix(value,attributes[1][i],this.endpoint));
    const pointerDistance=grid.sub(u.cursor).mul(vec2(u.aspect,1)).length().div(PROFILE_CARD_POINTER.radius);
    const pointer=exp(pointerDistance.mul(pointerDistance).mul(-4.5))
      .mul(smoothstep(float(.65),float(1),pointerDistance).oneMinus()).mul(PROFILE_CARD_POINTER.gain);
    const fieldSample=Fn(()=>{
      const time=u.time;
      const pos=grid.mul(vec2(u.aspect,.999)).mul(.5);
      const t=time.mul(.574437201).add(63.9310913);
      const breath=sin(time.mul(.55619818*1.5)).negate().add(sin(time.mul(.55619818).add(1))).mul(.25).add(.5);
      const q0=pos.sub(vec2(u.aspect.mul(.4).min(.66989404),.0368418619)).mul(float(.916716754).sub(breath.mul(.0718214214)));
      const ct=Math.cos(-1.58243895),st=Math.sin(-1.58243895);
      const p=vec2(q0.x.mul(ct).sub(q0.y.mul(st)),q0.x.mul(st).add(q0.y.mul(ct))).toVar();
      const color=vec3(0).toVar();
      Loop({start:1,end:82,type:'int',condition:'<'},({i})=>{
        const layer=float(i);
        p.x.addAssign(sin(p.y.mul(.518759429).add(t).add(layer.mul(.007))).mul(-.136494592));
        p.y.addAssign(sin(p.x.mul(2.27195549).sub(t).add(layer.mul(.02))).mul(-.029821597));
        p.assign(vec2(p.x.mul(Math.cos(2.12135649)).sub(p.y.mul(.958819687)),
          p.x.mul(Math.sin(2.12135649)).add(p.y.mul(Math.cos(2.12135649)))).mul(.958296239));
        const q=p.sub(vec2(breath.mul(.1).add(.367117733),-.0500464737));
        const s=q.mul(vec2(2.02228546,.216558114));
        const glow=float(.00190540182).div(s.dot(s).add(.00175177713)).mul(breath.mul(.4).add(.25));
        const r=p.length();
        const k=sin(layer.mul(.104406454).add(t.mul(1.2)).add(r.mul(2.11884952))).mul(.5).add(.5);
        const hue=k.mul(.467073709*Math.PI*2).add(.568625867*Math.PI*2);
        const L=k.mul(.22824429).add(.605977595),C=k.mul(.35).add(.75).mul(.0978347883);
        const a=C.mul(cos(hue)),b=C.mul(sin(hue));
        const l=L.add(a.mul(.3963377774)).add(b.mul(.2158037573)).pow(3);
        const m=L.sub(a.mul(.1055613458)).sub(b.mul(.0638541728)).pow(3);
        const n=L.sub(a.mul(.0894841775)).sub(b.mul(1.291485548)).pow(3);
        const tint=vec3(l.mul(4.0767416621).sub(m.mul(3.3077115913)).add(n.mul(.2309699292)),
          l.mul(-1.2684380046).add(m.mul(2.6097574011)).sub(n.mul(.3413193965)),
          l.mul(-.0041960863).sub(m.mul(.7034186147)).add(n.mul(1.707614701))).clamp(0,1);
        color.addAssign(tint.mul(glow).mul(exp2(r.mul(-.492685437))));
      });
      const x=color.max(0);
      const mapped=x.mul(x.mul(2.51).add(.03)).div(x.mul(x.mul(2.43).add(.59)).add(.14)).clamp(0,1).pow(vec3(.85,.92,.98));
      // Photographic grade: preserve chroma in shadows, cool soft whites in highlights.
      const luminance=mapped.dot(vec3(.2126,.7152,.0722));
      const neutral=mix(vec3(luminance).mul(vec3(.91,.94,1)),mapped,.34);
      const purple=mix(vec3(.30,.055,.95),vec3(.86,.12,.72),sin(time.mul(.36).add(grid.x.mul(7)).add(grid.y.mul(5))).mul(.5).add(.5))
        .mul(luminance.mul(1.35)).add(mapped.mul(.10));
      const graded=mix(neutral,purple,pointer);
      const vignette=smoothstep(float(.48),float(1.35),pos.length()).oneMinus();
      // Keep the reading area quiet without an opaque panel behind the text.
      const reading=mix(float(.32),float(1),smoothstep(float(-.55),float(.25),grid.x));
      const edge=smoothstep(float(.8),float(1),grid.x.abs()).oneMinus()
        .mul(smoothstep(float(.8),float(1),grid.y.abs()).oneMinus());
      const mask=vignette.mul(reading).mul(edge).mul(1.05);
      return vec4(graded.mul(mask),neutral.dot(vec3(.2126,.7152,.0722)).mul(mask));
    })();
    const field=fieldSample.rgb,brightness=fieldSample.a;
    const dotScale=smoothstep(float(.025),float(.8),brightness).mul(.82).add(.10);
    const localFlight=smoothstep(float(0),float(1),this.flight.mul(1.18).sub(seed.w.mul(.18)));
    const world=profileParticleMotionNode(target,ma,mb,control,u);
    const view=u.viewA.mul(vec4(world,1)).xyz;
    const targetDepth=view.z.negate().max(.005);
    const breath=vec2(sin(u.time.mul(PROFILE_BREATH.xSpeed)).mul(PROFILE_BREATH.x),sin(u.time.mul(PROFILE_BREATH.ySpeed)).mul(PROFILE_BREATH.y));
    const targetNdc=vec2(view.x.mul(u.projectionA.x).add(view.z.mul(u.projectionA.z)),view.y.mul(u.projectionA.y).add(view.z.mul(u.projectionA.w)))
      .div(targetDepth).add(vec2(u.offset,0)).add(breath);
    const arc=vec2(sin(seed.w.mul(19)).mul(.16),cos(seed.w.mul(13)).mul(.13).add(.10)).mul(sin(localFlight.mul(Math.PI)));
    const ndc=mix(grid,targetNdc,localFlight).add(arc),depth=mix(float(12),targetDepth,localFlight);
    const targetBrightness=target.w.mul(.7).add(.16).div(targetDepth.mul(.16).add(1))
      .add(sin(u.time.mul(1.4).add(seed.w.mul(Math.PI*2))).mul(.055)).clamp(.08,1);
    const material=new PointsNodeMaterial();
    material.positionNode=vec3(ndc.mul(depth).div(u.fixedProjection),depth.negate());
    const cardSize=depth.mul(2*1.2).mul(this.spacing).div(u.height.mul(u.fixedProjection.y)).mul(dotScale);
    material.sizeNode=mix(cardSize,depth.mul(2*1.65).div(u.height),localFlight);
    material.colorNode=varying(mix(field,vec3(targetBrightness),localFlight));
    // Rounded phosphor cells and fine diagonal scan texture, matching the reference.
    const cell=uv().sub(.5).mul(vec2(1,.93)).length();
    const scan=sin(uv().y.add(uv().x.mul(.25)).mul(Math.PI*10)).mul(.035).add(.965);
    material.opacityNode=smoothstep(float(.32),float(.5),cell).oneMinus().mul(scan).mul(this.visibility);
    // The transparent queue renders after the model. Fade coverage, not RGB:
    // a nearly black, still-opaque arriving dot would cover the bright model.
    material.transparent=true;
    material.alphaTest=.001;material.alphaToCoverage=true;material.depthWrite=false;material.depthTest=false;
    this.points=new Sprite(material);this.points.geometry=this.points.geometry.clone();this.points.frustumCulled=false;this.points.renderOrder=-10;
  }
  resize(width:number,height:number){
    if(width===this.width&&height===this.height)return;
    this.width=width;this.height=height;
    const grid=createProfileCardGrid(width,height);
    this.coordinates.array.set(grid.coordinates);this.coordinates.needsUpdate=true;
    this.spacing.value=grid.spacing;this.points.count=grid.coordinates.length/2;
    this.dotCount=this.points.count;this.updateTargets();
  }
  setTargets(source:ProfileParticleArrays,shots:ProfileShot[]){this.source=source;this.shots=shots;this.updateTargets();}
  private updateTargets(){
    if(!this.source||this.shots.length<6||!this.dotCount)return;
    const source=this.source,arrays=[source.a,source.motionA,source.motionB,source.control,source.ambient];
    for(const end of [0,1] as const){
      const ids=profileCardTargets(source,this.shots,this.dotCount,this.width/this.height,end===0?0:5);
      arrays.forEach((array,channel)=>{
        for(let i=0;i<ids.length;i++)this.targetBuffer.array.set(array.subarray(ids[i]*4,ids[i]*4+4),i*40+end*20+channel*4);
      });
    }
    this.targetBuffer.needsUpdate=true;
  }
  setVisibility(value:number,ending=false){
    this.endpoint.value=ending?1:0;
    this.flight.value=this.shots.length===6?1-value:0;
    this.visibility.value=this.shots.length===6?1-profileFlightHandoff(1-value):value;
    this.points.visible=this.visibility.value>0;
  }
  dispose(){this.points.geometry.dispose();this.points.material.dispose();}
}
