import { publicAssetUrl } from '../../platform/publicAssets.ts';

export const CULTURAL={count:48000,scenes:6,rotateSeconds:5,reliefRotateSeconds:4,morphSeconds:1.2,angle:Math.PI/6,reliefAngle:Math.PI/9,localScatter:.09,center:[-9.5,.6,-.6] as const};
export function culturalAngle(index:number){return index===0?CULTURAL.angle:CULTURAL.reliefAngle;}
export function culturalCycle(time:number){
  const duration=CULTURAL.rotateSeconds+CULTURAL.morphSeconds+(CULTURAL.scenes-1)*(CULTURAL.reliefRotateSeconds+CULTURAL.morphSeconds);
  let elapsed=Math.max(0,time)%duration,index=0;
  while(index<CULTURAL.scenes-1){
    const section=(index===0?CULTURAL.rotateSeconds:CULTURAL.reliefRotateSeconds)+CULTURAL.morphSeconds;
    if(elapsed<section)break;
    elapsed-=section;index++;
  }
  const rotateSeconds=index===0?CULTURAL.rotateSeconds:CULTURAL.reliefRotateSeconds,angle=culturalAngle(index);
  const raw=Math.max(0,(elapsed-rotateSeconds)/CULTURAL.morphSeconds),morph=raw*raw*(3-2*raw);
  return {index,next:(index+1)%CULTURAL.scenes,morph,
    angle:-angle/2+angle*Math.min(1,elapsed/rotateSeconds)};
}
export type CulturalScene={positions:Float32Array;colors:Uint8Array};
/** Fit the visible volume throughout its turn, preserving depth and aspect ratio. */
export function culturalExtent(scene:CulturalScene,index=0):[number,number]{
  let x=0,y=0;
  for(let i=0;i<scene.colors.length/4;i++){
    if(scene.colors[i*4+3]<85)continue;
    const [px,py,pz]=scene.positions.subarray(i*3,i*3+3);
    for(const angle of [-culturalAngle(index)/2,0,culturalAngle(index)/2]){
      const rx=px*Math.cos(angle)+pz*Math.sin(angle),rz=pz*Math.cos(angle)-px*Math.sin(angle);
      const depth=Math.max(.2,3.8-rz);
      x=Math.max(x,Math.abs(rx)*1.55/depth);y=Math.max(y,Math.abs(py)*1.55/depth);
    }
  }
  return [Math.max(.01,x),Math.max(.01,y)];
}
export function culturalFit(extent:[number,number],aspect:number,sceneIndex=0){
  if(sceneIndex===0)return Math.min(.8*aspect/extent[0],.8/extent[1]);
  // Cover the viewport without stretching the photo. The shader feathers the
  // screen perimeter as well as the baked image edge when cover crops a side.
  return Math.max(1.06*aspect/extent[0],1.06/extent[1]);
}
export function culturalVerticalOffset(extent:[number,number],fit:number,sceneIndex:number){
  // Tall portrait: keep the upper body in frame as the image fills the screen.
  return sceneIndex===0?0:-.5*Math.max(0,extent[1]*fit-1.06);
}
export function decodeCultural(buffer:ArrayBuffer):CulturalScene[]{
  const n=CULTURAL.count;
  if(buffer.byteLength!==16+n*16*CULTURAL.scenes)throw new Error('Invalid Cultural cache length');
  const h=new DataView(buffer);
  if(h.getUint32(0,true)!==0x31554350||h.getUint32(4,true)!==n||h.getUint32(8,true)!==6||h.getUint32(12,true)!==1)throw new Error('Invalid Cultural cache header');
  return Array.from({length:6},(_,i)=>{
    const offset=16+i*n*16,positions=new Float32Array(buffer,offset,n*3);
    if(!positions.every(Number.isFinite))throw new Error('Nonfinite Cultural coordinate');
    return {positions,colors:new Uint8Array(buffer,offset+n*12,n*4)};
  });
}
export async function fetchCultural(signal:AbortSignal){
  const response=await fetch(publicAssetUrl('/particles/profile/cultural.bin'),{signal:AbortSignal.any([signal,AbortSignal.timeout(20000)])});
  if(!response.ok)throw new Error(`Cultural HTTP ${response.status}`);
  const buffer=await response.arrayBuffer();signal.throwIfAborted();return decodeCultural(buffer);
}
