import { mulberry32 } from '../seededRandom.ts';
import type { ProfileModel } from './profileCache.ts';

export const PROFILE_BREATH = {x:.002,y:.005,xSpeed:.31,ySpeed:.43} as const;
export function profileBreathingOffset(time:number):[number,number] {
  return [Math.sin(time*PROFILE_BREATH.xSpeed)*PROFILE_BREATH.x,Math.sin(time*PROFILE_BREATH.ySpeed)*PROFILE_BREATH.y];
}
export function createProfileGround(model?:ProfileModel) {
  if(!model)return {positions:new Float32Array(),normals:new Float32Array(),rands:new Float32Array(),fades:new Float32Array(),alts:new Float32Array()};
  const columns=model.groups.filter(g=>g.kind==='height');
  const anchors=columns.length?columns.map(g=>g.pivot):[model.shots[0].rawTarget];
  const count=48000,random=mulberry32(0x67726f75);
  const positions=new Float32Array(count*3),normals=new Float32Array(count*3);
  const rands=new Float32Array(count),fades=new Float32Array(count),alts=new Float32Array(count);
  const floor=Math.min(...anchors.map(p=>p[1]))-.002;
  for(let i=0;i<count;i++){
    const anchor=anchors[i%anchors.length],theta=random()*Math.PI*2;
    // Dense local footprint plus logarithmic distant tail: no visible outer rim.
    const radius=i<count*.76?Math.sqrt(-2*Math.log(Math.max(1e-7,random())))*.30:
      .7*Math.exp(random()*Math.log(70/.7));
    const x=anchor[0]+Math.cos(theta)*radius,z=anchor[2]+Math.sin(theta)*radius;
    const nearest=Math.min(...anchors.map(p=>Math.hypot(x-p[0],z-p[2])));
    positions.set([x,floor,z],i*3);normals[i*3+1]=1;rands[i]=random();
    fades[i]=Math.exp(-nearest*.40)/(1+nearest*.18);
  }
  return {positions,normals,rands,fades,alts};
}
