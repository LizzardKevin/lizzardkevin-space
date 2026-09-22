import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Matrix4,Vector3,Vector4,PerspectiveCamera} from 'three';
import {profileSceneCamera,extendProfileShots} from '../../src/particles/profile/profileCamera.ts';
const manifest=JSON.parse(readFileSync(new URL('../../public/particles/profile/manifest.json',import.meta.url),'utf8'));
test('four runtime endpoints reproduce authored NDC including two-point lens shift',()=>{
 const shots=extendProfileShots(manifest.model.shots);
 for(const [index,s] of manifest.model.shots.entries()){
  const basis=new Matrix4().makeBasis(new Vector3(...s.cameraX),new Vector3(...s.cameraY),new Vector3(...s.cameraZ));
  basis.setPosition(...s.eye);const expectedView=basis.invert();
  const {view:actualView,projection:params}=profileSceneCamera(shots,index,s.savedAspect);
  expectedView.elements.forEach((n,i)=>assert.ok(Math.abs(n-actualView.elements[i])<1e-10));
  const projection=new Matrix4().fromArray(s.projection).transpose();
  const fixed=new PerspectiveCamera(50,s.savedAspect,.002,200);
  for(const point of [[0,0,0],[.15,.2,-.4],[-.5,.4,.6]]){
   const view=new Vector4(...point,1).applyMatrix4(actualView),expected=view.clone().applyMatrix4(projection);
   const canonical=new Vector4((view.x*params.x+view.z*params.z)/fixed.projectionMatrix.elements[0],(view.y*params.y+view.z*params.w)/fixed.projectionMatrix.elements[5],view.z,1).applyMatrix4(fixed.projectionMatrix);
   assert.ok(Math.abs(expected.x/expected.w-canonical.x/canonical.w)<1e-8);
   assert.ok(Math.abs(expected.y/expected.w-canonical.y/canonical.w)<1e-8);
  }
 }
});
test('intermediate camera frames remain rigid and finite',()=>{
 const shots=extendProfileShots(manifest.model.shots);
 for(let i=0;i<=500;i++){
  const {view:v,projection,distance}=profileSceneCamera(shots,i/100,16/9);
  assert.ok(v.elements.every(Number.isFinite));assert.ok(Math.abs(v.determinant()-1)<1e-10);
  assert.ok(projection.toArray().every(Number.isFinite));assert.ok(distance>0);
 }
});

test('six camera poses extend the four saved shots without mutating their source',()=>{
 const original=structuredClone(manifest.model.shots),shots=extendProfileShots(manifest.model.shots);
 assert.deepEqual(shots.slice(0,4),original);assert.deepEqual(manifest.model.shots,original);
 assert.deepEqual(shots.map(s=>s.name.toLowerCase()),['student','career','photo','band','cultural','experimental']);
 assert.deepEqual(profileSceneCamera(shots,-1,1).view.elements,profileSceneCamera(shots,0,1).view.elements);
 assert.deepEqual(profileSceneCamera(shots,6,1).view.elements,profileSceneCamera(shots,5,1).view.elements);
});

test('Career to Photo travels outside before entering through the actual window',()=>{
 const shots=extendProfileShots(manifest.model.shots),portal=manifest.exterior.portal;
 let previous=new Vector3().setFromMatrixPosition(profileSceneCamera(shots,1,1).view.clone().invert());
 let exteriorReached=false,windowEntries=0;
 for(let i=1;i<=1000;i++){
  const eye=new Vector3().setFromMatrixPosition(profileSceneCamera(shots,1+i/1000,1).view.clone().invert());
  if(eye.z>portal.z)exteriorReached=true;
  if(previous.z>portal.z&&eye.z<=portal.z){
   const hit=previous.clone().lerp(eye,(portal.z-previous.z)/(eye.z-previous.z));
   assert.ok(hit.x>portal.xMin&&hit.x<portal.xMax,`window entry x=${hit.x}`);
   assert.ok(hit.y>portal.yMin&&hit.y<portal.yMax,`window entry y=${hit.y}`);
   windowEntries++;
  }
  assert.ok(eye.distanceTo(previous)<.05,'camera cannot jump along the route');
  previous=eye;
 }
 assert.equal(exteriorReached,true);assert.equal(windowEntries,1);
});
