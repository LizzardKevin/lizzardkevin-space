import { Vector3 } from 'three';
import type { ProfileShot } from './profileCache.ts';
import type { ProfileParticleArrays } from './profileParticleArrays.ts';
import { profileSceneCamera } from './profileCamera.ts';

export const PROFILE_CARD_POINTER={radius:.20,gain:.94} as const;
export function profileFlightHandoff(flight:number){
  const t=Math.max(0,Math.min(1,(flight-.72)/.28));
  return t*t*(3-2*t);
}

/** Map every phosphor pixel to a real, visible source particle. Sort in screen
 * rows to avoid arbitrary crossings; preserve source IDs and motion attributes. */
export function profileCardTargets(arrays:ProfileParticleArrays,shots:ProfileShot[],count:number,aspect:number,endpoint:0|5){
  const frame=profileSceneCamera(shots,endpoint,aspect),point=new Vector3();
  const candidates:{index:number;x:number;y:number}[]=[];
  for(let i=0;i<arrays.count;i++){
    const offset=i*4;
    if(arrays.control[offset+3]!==0)continue;
    if(endpoint===0&&arrays.motionA[offset]<=0)continue;
    point.fromArray(arrays.a,offset).applyMatrix4(frame.view);
    if(point.z>=-.01)continue;
    const x=(point.x*frame.projection.x+point.z*frame.projection.z)/-point.z;
    const y=(point.y*frame.projection.y+point.z*frame.projection.w)/-point.z;
    if(Math.abs(x)<1.35&&Math.abs(y)<1.35)candidates.push({index:i,x,y});
  }
  candidates.sort((a,b)=>Math.floor(a.y*90)-Math.floor(b.y*90)||a.x-b.x||a.index-b.index);
  const indices=new Uint32Array(count);
  for(let i=0;i<count;i++)indices[i]=candidates[Math.min(candidates.length-1,Math.floor(i*candidates.length/count))]?.index??0;
  return indices;
}
