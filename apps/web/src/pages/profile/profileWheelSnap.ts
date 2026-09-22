export const PROFILE_WHEEL_SNAP={windowMs:200,quietMs:180,minEvents:10} as const;
type WheelSample={time:number};
export type ProfileWheelGesture={samples:WheelSample[];direction:number;fast:boolean;start:number};
export function createProfileWheelGesture():ProfileWheelGesture{return {samples:[],direction:0,fast:false,start:0};}
export function sampleProfileWheel(g:ProfileWheelGesture,time:number,delta:number,position:number):boolean {
  if(!Number.isFinite(delta)||delta===0)return g.fast;
  const direction=Math.sign(delta),last=g.samples.at(-1);
  if(direction!==g.direction||!last||time-last.time>PROFILE_WHEEL_SNAP.windowMs){
    g.samples=[];g.fast=false;g.start=position;g.direction=direction;
  }
  g.samples=g.samples.filter(sample=>time-sample.time<=PROFILE_WHEEL_SNAP.windowMs);
  g.samples.push({time});
  if(g.samples.length>=PROFILE_WHEEL_SNAP.minEvents)g.fast=true;
  return g.fast;
}
export function resolveProfileSnapTarget(centers:readonly number[],position:number,direction:number,start:number):number|null {
  if(!centers.length)return null;
  const candidates=centers.filter(center=>direction>0?center>start+3:center<start-3);
  const choices=candidates.length?candidates:centers;
  return choices.reduce((best,center)=>Math.abs(center-position)<Math.abs(best-position)?center:best,choices[0]);
}
