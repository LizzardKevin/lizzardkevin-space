import { mulberry32 } from '../seededRandom.ts';
import { type ProfileExteriorData, type ProfileModelData } from './profileCache.ts';
import { createProfileGround } from './profileSceneDecorations.ts';

/** A single immutable source-position array for all chapters. */
export function buildProfileParticleArrays(model?:ProfileModelData,exterior?:ProfileExteriorData){
  const ground=createProfileGround(model?.model),sourceCount=model?.cache.groupIndices.length??24000;
  const groundCount=ground.fades.length,exteriorCount=exterior?.exterior.pointCount??0,count=sourceCount+groundCount+exteriorCount;
  const a=new Float32Array(count*4),motionA=new Float32Array(count*4),motionB=new Float32Array(count*4),control=new Float32Array(count*4),ambient=new Float32Array(count*4);
  const rng=mulberry32(0x53504143);
  for(let i=0;i<count;i++){
    const offset=i*4,depth=1.5+rng()*5;
    ambient.set([(rng()*2-1)*depth*1.1,(rng()*2-1)*depth*.62,-depth,rng()],offset);
    if(i>=sourceCount){
      const j=i-sourceCount;
      if(j<groundCount){a.set([ground.positions[j*3],ground.positions[j*3+1],ground.positions[j*3+2],.32],offset);control[offset+1]=ground.fades[j];control[offset+3]=1;}
      else if(exterior){const n=(j-groundCount)*3;a.set([exterior.cache.positions[n],exterior.cache.positions[n+1],exterior.cache.positions[n+2],.8],offset);control[offset+3]=2;}
    }else if(model){
      const n=i*3,g=model.model.groups[model.cache.groupIndices[i]];
      const light=Math.min(1,.3+.7*Math.max(0,model.cache.normals[n]*.35+model.cache.normals[n+1]*.75+model.cache.normals[n+2]*.55));
      a.set([model.cache.positions[n],model.cache.positions[n+1],model.cache.positions[n+2],light],offset);
      if(g.kind==='height')motionA.set([g.amplitude[0],0,g.frequencyHz,g.phase[0]],offset);
      if(g.kind==='crowd')motionB.set([g.amplitude[0],g.amplitude[1],g.frequencyHz,g.phase[0]],offset);
      control.set([g.pivot[1],g.phase[1],g.phase[1],0],offset);
    }
  }
  return {a,motionA,motionB,control,ambient,count,groundCount,exteriorCount};
}
export type ProfileParticleArrays=ReturnType<typeof buildProfileParticleArrays>;
