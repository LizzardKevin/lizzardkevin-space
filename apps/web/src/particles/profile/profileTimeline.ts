export type ProfileStage = 'hero' | 'student' | 'career' | 'photo' | 'band' | 'culture' | 'experiments' | 'links';
export type ProfileStop = {stage:ProfileStage;offset:number};
export type ProfileTimeline={from:ProfileStage;to:ProfileStage;progress:number;cameraProgress:number;viewOffset:number;motionTime:number};
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
export const profileEase=(x:number)=>{const t=clamp(x);return clamp(t*t*t*(t*(t*6-15)+10));};
const cameraIndex:Record<ProfileStage,number>={hero:0,student:0,career:1,photo:2,band:3,culture:4,experiments:5,links:5};
const side=(s:ProfileStage)=>['student','photo','culture'].includes(s)?.2:['career','band','experiments'].includes(s)?-.2:0;
/** One fixed point cloud; only its camera-space transform changes with scroll. */
export function resolveProfileTimeline(scrollTop:number,stops:readonly ProfileStop[],viewportHeight=0):ProfileTimeline{
  if(!stops.length)return {from:'hero',to:'hero',progress:0,cameraProgress:0,viewOffset:0,motionTime:0};
  const scroll=Number.isFinite(scrollTop)?scrollTop:0;
  let index=0;while(index<stops.length-1&&scroll>=stops[index+1].offset)index++;
  const from=stops[index],to=stops[Math.min(index+1,stops.length-1)],gap=to.offset-from.offset;
  const hold=Math.min(Math.max(0,viewportHeight*.12),Math.max(0,gap*.1));
  const progress=from===to?0:profileEase((scroll-from.offset-hold)/Math.max(1,gap-hold*2));
  return {from:from.stage,to:to.stage,progress,cameraProgress:cameraIndex[from.stage]+(cameraIndex[to.stage]-cameraIndex[from.stage])*progress,
    viewOffset:side(from.stage)+(side(to.stage)-side(from.stage))*progress,motionTime:(index+clamp((scroll-from.offset)/Math.max(1,gap)))*9};
}
