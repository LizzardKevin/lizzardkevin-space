import { Matrix4, Vector3 } from 'three';
import type { ProfileModel } from './profileCache.ts';

/** Same two-spacing displacement calibration as WorkDetail, in this model's units. */
export function profileCursorJitter(model:ProfileModel,count:number):number {
  const [lo,hi]=model.bounds;
  const volume=Math.max((hi[0]-lo[0])*(hi[1]-lo[1])*(hi[2]-lo[2]),1e-6);
  const spacing=Math.cbrt(volume/Math.max(count,1)),order=10**Math.floor(Math.log10(spacing));
  return 2*(Math.floor(spacing/order*10)/10)*order;
}

/** Half of WorkDetail's angular range, with its calibrated damping and local feedback. */
export const PROFILE_POINTER = {
  azimuth: Math.PI / 12, elevation: Math.PI / 24,
  parallaxDamping: 3, cursorDamping: 8, settleEpsilon: 1e-6,
  radius: .25, gain: 1, sizeGain: .15,
} as const;
export function createProfilePointer() {
  return {targetX:10,targetY:10,x:10,y:10,azimuth:0,elevation:0};
}
export type ProfilePointer = ReturnType<typeof createProfilePointer>;
export function advanceProfilePointer(p:ProfilePointer,dt:number):boolean {
  const cursorBlend=Math.min(Math.max(dt,0)*PROFILE_POINTER.cursorDamping,1);
  p.x+=(p.targetX-p.x)*cursorBlend;p.y+=(p.targetY-p.y)*cursorBlend;
  const offscreen=Math.abs(p.targetX)>2 || Math.abs(p.targetY)>2;
  const clamp=(v:number)=>Math.max(-1,Math.min(1,v));
  const azimuth=offscreen?0:-clamp(p.targetX)*PROFILE_POINTER.azimuth;
  const elevation=offscreen?0:clamp(p.targetY)*PROFILE_POINTER.elevation;
  const da=azimuth-p.azimuth,de=elevation-p.elevation;
  if(Math.abs(da)<=PROFILE_POINTER.settleEpsilon && Math.abs(de)<=PROFILE_POINTER.settleEpsilon)return false;
  const blend=Math.min(Math.max(dt,0)*PROFILE_POINTER.parallaxDamping,1);
  p.azimuth+=da*blend;p.elevation+=de*blend;
  return true;
}

/** Inverse camera orbit in authored view space; its focus stays at (0,0,-distance). */
export function profileParallaxMatrix(azimuth:number,elevation:number,distance:number):Matrix4 {
  const d=Math.max(.01,distance),focus=new Vector3(0,0,-d);
  const eye=new Vector3(d*Math.sin(azimuth)*Math.cos(elevation),d*Math.sin(elevation),d*Math.cos(azimuth)*Math.cos(elevation)-d);
  return new Matrix4().lookAt(eye,focus,new Vector3(0,1,0)).setPosition(eye).invert();
}
