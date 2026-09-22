import { InstancedBufferAttribute, Matrix4, Vector2, Vector3, Vector4 } from 'three';
import { PointsNodeMaterial } from 'three/webgpu';
import { exp, float, instancedBufferAttribute, mix, sin, smoothstep, uniform, uv, varying, vec2, vec3, vec4 } from 'three/tsl';
import type { ProfileParticleArrays } from './profileParticleArrays.ts';
import { PROFILE_POINTER } from './profilePointer.ts';
import { GROUND_STYLE } from '../groundPointField.ts';
import { PROFILE_BREATH } from './profileSceneDecorations.ts';
import { profileParticleMotionNode } from './profileParticleMotionNode.ts';

export function createProfileUniforms() {
  return {
    time:uniform(0),flow:uniform(0),offset:uniform(0),cloudVisibility:uniform(1),
    viewA:uniform(new Matrix4()),fieldView:uniform(new Matrix4()),
    projectionA:uniform(new Vector4(1,1,0,0)),
    fixedProjection:uniform(new Vector2(1,1)),cursor:uniform(new Vector2(10,10)),
    aspect:uniform(1),height:uniform(900),availableA:uniform(0),
    jitterA:uniform(0),
    eyeB:uniform(new Vector3()),portalRect:uniform(new Vector4(-.5942,.6058,.1,.8)),portalZ:uniform(2.19905),
    occluderMinA:uniform(new Vector3()),occluderMaxA:uniform(new Vector3()),
    occluderMinB:uniform(new Vector3()),occluderMaxB:uniform(new Vector3()),occlusionEnabled:uniform(0),occlusionBias:uniform(.012),
  };
}
export type ProfileUniforms = ReturnType<typeof createProfileUniforms>;

export function createProfileParticleMaterial(arrays: ProfileParticleArrays, u: ProfileUniforms) {
  const attr=(a:Float32Array)=>instancedBufferAttribute<'vec4'>(new InstancedBufferAttribute(a,4),'vec4');
  const a=attr(arrays.a),ma=attr(arrays.motionA),mb=attr(arrays.motionB),control=attr(arrays.control),field=attr(arrays.ambient);
  const ground=control.w.equal(1).select(float(1),float(0));
  const exterior=control.w.equal(2).select(float(1),float(0));
  const pb=profileParticleMotionNode(a,ma,mb,control,u);
  const va=u.viewA.mul(vec4(pb,1)).xyz;
  // Put the authored perspective (including lens shift) into particle coordinates.
  // The actual rendering camera remains fixed: the points perform the camera movement.
  const ca=vec3(va.x.mul(u.projectionA.x).add(va.z.mul(u.projectionA.z)).div(u.fixedProjection.x),va.y.mul(u.projectionA.y).add(va.z.mul(u.projectionA.w)).div(u.fixedProjection.y),va.z);
  const phase=field.w.mul(Math.PI*2);
  const ambient=u.fieldView.mul(vec4(field.xyz.add(vec3(sin(u.flow.mul(.2).add(phase)).mul(.18),sin(u.flow.mul(.13).add(phase)).mul(.12),0)),1)).xyz;
  const position=mix(ambient,ca,u.availableA);
  const breathing=vec2(sin(u.time.mul(PROFILE_BREATH.xSpeed)).mul(PROFILE_BREATH.x),sin(u.time.mul(PROFILE_BREATH.ySpeed)).mul(PROFILE_BREATH.y))
    .mul(ground.oneMinus()).mul(u.availableA);
  const final=vec3(position.x.add(position.z.negate().mul(u.offset.add(breathing.x)).div(u.fixedProjection.x)),
    position.y.add(position.z.negate().mul(breathing.y).div(u.fixedProjection.y)),position.z);
  const depth=final.z.negate().max(.005);
  const ndc=final.xy.mul(u.fixedProjection).div(depth);
  const distance=ndc.sub(u.cursor).mul(vec2(u.aspect,1)).length();
  const cursorT=distance.div(PROFILE_POINTER.radius*1.8);
  const glow=exp(cursorT.mul(cursorT).mul(-4.5)).mul(smoothstep(float(.65),float(1),cursorT).oneMinus());
  const jitterDir=vec3(sin(field.w.mul(12.9898)),sin(field.w.mul(78.233)),sin(field.w.mul(37.719))).mul(.5774);
  const jitterFlutter=sin(u.time.mul(2.1).add(phase)).mul(.25).add(.75);
  const jitter=jitterDir.mul(u.jitterA).mul(glow).mul(jitterFlutter)
    .mul(mix(float(1),float(.5),ground)).mul(ma.x.greaterThan(0).select(float(.2),float(1))).mul(u.availableA);
  const jittered=final.add(jitter);
  const lighting=a.w;
  const twinkle=sin(u.time.mul(1.4).add(phase)).mul(.055);
  const modelBrightness=mix(lighting.mul(.7).add(.16),float(.065).add(field.w.mul(.12)),u.availableA.oneMinus())
    .mul(float(1).div(depth.mul(.16).add(1))).add(twinkle).add(glow.mul(PROFILE_POINTER.gain)).clamp(.08,1);
  const groundFade=mix(float(1),control.y,ground);
  const brightness=mix(modelBrightness,float(GROUND_STYLE.brightness).add(twinkle.mul(.25)).add(glow.mul(.5)),ground).mul(groundFade);
  // Only exterior points are clipped to the actual opening in the author model.
  const rayT=u.portalZ.sub(u.eyeB.z).div(pb.z.sub(u.eyeB.z).max(.000001));
  const portalHit=u.eyeB.xy.add(pb.xy.sub(u.eyeB.xy).mul(rayT));
  const portalMask=smoothstep(u.portalRect.x,u.portalRect.x.add(.012),portalHit.x)
    .mul(smoothstep(u.portalRect.y.sub(.012),u.portalRect.y,portalHit.x).oneMinus())
    .mul(smoothstep(u.portalRect.z,u.portalRect.z.add(.012),portalHit.y))
    .mul(smoothstep(u.portalRect.w.sub(.012),u.portalRect.w,portalHit.y).oneMinus())
    .mul(rayT.greaterThan(0).select(float(1),float(0))).mul(rayT.lessThan(1).select(float(1),float(0)));
  // Segment/box slabs use the actual world-space eye, so buildings occlude the
  // bridge for every saved camera and pointer orbit, not just the Photo endpoint.
  const ray=pb.sub(u.eyeB),rayLength=ray.length().max(.000001);
  const safeRay=vec3(ray.x.abs().max(.000001).mul(ray.x.lessThan(0).select(float(-1),float(1))),
    ray.y.abs().max(.000001).mul(ray.y.lessThan(0).select(float(-1),float(1))),
    ray.z.abs().max(.000001).mul(ray.z.lessThan(0).select(float(-1),float(1))));
  const blocked=(lo:typeof u.occluderMinA,hi:typeof u.occluderMaxA)=>{
    const t0=lo.sub(u.eyeB).div(safeRay),t1=hi.sub(u.eyeB).div(safeRay);
    const near=t0.min(t1),far=t0.max(t1);
    const entry=near.x.max(near.y).max(near.z).max(0),exit=far.x.min(far.y).min(far.z).min(1);
    return entry.lessThan(exit).and(entry.lessThan(float(1).sub(u.occlusionBias.div(rayLength)))).select(float(1),float(0));
  };
  const exteriorClear=float(1).sub(blocked(u.occluderMinA,u.occluderMaxA).max(blocked(u.occluderMinB,u.occluderMaxB)).mul(u.occlusionEnabled));
  const aperture=u.eyeB.z.greaterThan(u.portalZ).select(float(1),portalMask);
  const visibility=mix(float(1),aperture.mul(exteriorClear),exterior);
  const mat=new PointsNodeMaterial();
  mat.positionNode=jittered;
  mat.sizeNode=mix(depth.mul(2*1.65).div(u.height),depth.mul(2*GROUND_STYLE.diameterPixels/GROUND_STYLE.referenceHeight),ground)
    .mul(glow.mul(PROFILE_POINTER.sizeGain).add(1)).mul(visibility).mul(groundFade.sqrt()).mul(u.cloudVisibility.sqrt());
  // Reveal the opaque cloud by area while preserving each point's light level.
  // Dimming opaque RGB can write black points over the page during handoff.
  mat.colorNode=vec3(varying(brightness));
  mat.opacityNode=smoothstep(float(.30),float(.5),uv().sub(vec2(.5)).length()).oneMinus().mul(mix(float(.45),float(1),u.availableA))
    .mul(mix(float(1),control.y,ground)).mul(varying(visibility));
  // Hidden auxiliary points and portal rejects must discard even on a single-sample surface.
  mat.alphaTest=.001;
  mat.alphaToCoverage=true;mat.depthWrite=true;mat.depthTest=true;mat.transparent=false;
  return mat;
}
