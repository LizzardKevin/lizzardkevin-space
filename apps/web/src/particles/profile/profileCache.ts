import { publicAssetUrl } from '../../platform/publicAssets.ts';

export type Triple = [number, number, number];
export type ProfileMotionGroup = {
  index: number; kind: 'static' | 'height' | 'crowd'; pivot: Triple;
  amplitude: [number, number]; frequencyHz: number; phase: [number, number];
};
export type ProfileShot = {
  name: string; eye: Triple; cameraX: Triple; cameraY: Triple; cameraZ: Triple;
  projection: number[]; savedAspect: number; rawTarget: Triple;
};
export type ProfileModel = {
  id: 'profile'; url: string; groups: ProfileMotionGroup[]; shots: ProfileShot[]; bounds:[Triple,Triple];
};
export type ProfileOccluder={id:string;min:Triple;max:Triple};
export type ProfileExterior = {id:'dumbo';url:'dumbo.bin';pointCount:number;bounds:[Triple,Triple];portal:{z:number;xMin:number;xMax:number;yMin:number;yMax:number};occluders?:ProfileOccluder[];occlusionSurfaceBias?:number};
export type ProfileManifest = { version: number; pointCount: number; model: ProfileModel; exterior?:ProfileExterior };
export type ProfileCache = { positions: Float32Array; normals: Float32Array; groupIndices: Uint16Array };
export type ProfileModelData = { model: ProfileModel; cache: ProfileCache };
export type ProfileExteriorData = {exterior:ProfileExterior;cache:ProfileCache};
export const PROFILE_POINT_COUNT = 270_000;
export const PROFILE_ASSET_BASE = '/particles/profile/';

export function decodeProfileCache(buffer: ArrayBuffer, count: number, groupCount: number): ProfileCache {
  if (buffer.byteLength !== 16 + count * 20) throw new Error('Profile particle cache size mismatch');
  const view = new DataView(buffer);
  if (view.getUint32(0, true) !== 0x31525650 || view.getUint32(4,true) !== count || view.getUint32(8,true) !== 1) {
    throw new Error('Unsupported Profile particle cache');
  }
  const positions = new Float32Array(buffer,16,count*3);
  const packedNormals = new Int16Array(buffer,16+count*12,count*3);
  const groupIndices = new Uint16Array(buffer,16+count*18,count);
  const normals = new Float32Array(count*3);
  for (let i=0;i<count*3;i++) {
    if (!Number.isFinite(positions[i])) throw new Error('Nonfinite Profile particle coordinate');
    normals[i]=packedNormals[i]/32767;
  }
  for (const group of groupIndices) if (group>=groupCount) throw new Error('Unknown Profile motion group');
  return {positions,normals,groupIndices};
}

export function validateProfileManifest(value:ProfileManifest):ProfileManifest{
  if(value?.version!==2||value.pointCount!==PROFILE_POINT_COUNT)throw new Error('Invalid Profile manifest');
  const m=value.model;
  if(m?.id!=='profile'||m.url!=='scene.bin'||m.shots?.length!==4||m.groups?.[0]?.kind!=='static')throw new Error('Incomplete unified Profile scene');
  if(!Array.isArray(m.bounds)||m.bounds.length!==2||m.bounds.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite)))throw new Error('Invalid Profile model bounds');
  for(const [i,shot] of m.shots.entries()){
    if(shot.name.toLowerCase()!==['student','career','photo','band'][i])throw new Error('Invalid Profile camera order');
    if(!Array.isArray(shot.rawTarget)||shot.rawTarget.length!==3||!shot.rawTarget.every(Number.isFinite))throw new Error('Invalid Profile camera target');
    if(shot.projection?.length!==16||![...shot.eye,...shot.cameraX,...shot.cameraY,...shot.cameraZ,...shot.projection,shot.savedAspect].every(Number.isFinite)||shot.savedAspect<=0)throw new Error('Invalid Profile camera');
  }
  for(const [i,g] of m.groups.entries())if(g.index!==i||!['static','height','crowd'].includes(g.kind)||![...g.pivot,...g.amplitude,g.frequencyHz,...g.phase].every(Number.isFinite))throw new Error('Invalid Profile motion group');
  if(value.exterior){
    const e=value.exterior,p=e.portal;
    if(e.id!=='dumbo'||e.url!=='dumbo.bin'||e.pointCount!==45000||!p||![p.z,p.xMin,p.xMax,p.yMin,p.yMax].every(Number.isFinite)||p.xMin>=p.xMax||p.yMin>=p.yMax)throw new Error('Invalid Profile exterior');
    if(e.occluders&&(e.occluders.length!==2||e.occluders.some(b=>b.min?.length!==3||b.max?.length!==3||![...b.min,...b.max].every(Number.isFinite)||b.min.some((v,i)=>v>=b.max[i]))))throw new Error('Invalid Profile exterior occluders');
  }
  return value;
}
export async function fetchProfileManifest(signal: AbortSignal): Promise<ProfileManifest> {
  const response=await fetch(publicAssetUrl(`${PROFILE_ASSET_BASE}manifest.json`),{signal:AbortSignal.any([signal,AbortSignal.timeout(20_000)])});
  if (!response.ok) throw new Error(`Profile manifest HTTP ${response.status}`);
  return validateProfileManifest(await response.json());
}
export async function fetchProfileModel(model: ProfileModel, signal: AbortSignal): Promise<ProfileModelData> {
  const response=await fetch(publicAssetUrl(`${PROFILE_ASSET_BASE}${model.url}`),{signal:AbortSignal.any([signal,AbortSignal.timeout(20_000)])});
  if (!response.ok) throw new Error(`Profile ${model.id} HTTP ${response.status}`);
  const buffer=await response.arrayBuffer(); signal.throwIfAborted();
  return {model,cache:decodeProfileCache(buffer,PROFILE_POINT_COUNT,model.groups.length)};
}
export async function fetchProfileExterior(exterior:ProfileExterior,signal:AbortSignal):Promise<ProfileExteriorData>{
  const response=await fetch(publicAssetUrl(`${PROFILE_ASSET_BASE}${exterior.url}`),{signal:AbortSignal.any([signal,AbortSignal.timeout(20_000)])});
  if(!response.ok)throw new Error(`Profile exterior HTTP ${response.status}`);
  const buffer=await response.arrayBuffer();signal.throwIfAborted();
  return {exterior,cache:decodeProfileCache(buffer,exterior.pointCount,1)};
}
