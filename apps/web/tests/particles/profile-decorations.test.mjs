import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createProfileGround, profileBreathingOffset, PROFILE_BREATH } from '../../src/particles/profile/profileSceneDecorations.ts';
import { GROUND_STYLE } from '../../src/particles/groundPointField.ts';
import { profileCardMix, createProfileCardGrid, PROFILE_HALFTONE, PROFILE_DIFFUSION } from '../../src/particles/profile/profileAtmosphere.ts';
import { profileCardTargets, profileFlightHandoff } from '../../src/particles/profile/profileCardFlight.ts';
import { decodeProfileCache } from '../../src/particles/profile/profileCache.ts';
import { buildProfileParticleArrays } from '../../src/particles/profile/profileParticleArrays.ts';
import { extendProfileShots } from '../../src/particles/profile/profileCamera.ts';
import { ProfileCardField } from '../../src/particles/profile/ProfileCardField.ts';
import { createProfileParticleMaterial, createProfileUniforms } from '../../src/particles/profile/profileParticleMaterial.ts';
const manifest=JSON.parse(readFileSync(new URL('../../public/particles/profile/manifest.json',import.meta.url),'utf8'));

test('handoff fades coverage instead of leaving opaque black points over the model',()=>{
  const uniforms=createProfileUniforms(),card=new ProfileCardField(uniforms);
  const nodes=root=>{const found=new Set();root.traverse(node=>found.add(node));return found;};
  const material=card.points.material;
  const opacityUniforms=[...nodes(material.opacityNode)].filter(node=>node.isUniformNode);
  card.setVisibility(.02);
  const fade=opacityUniforms.find(node=>node.value===.02);
  assert.ok(fade,'card fade reaches the opacity graph');
  assert.equal(material.transparent,true);
  assert.equal(nodes(material.colorNode).has(fade),false,'fading dots retain their light colour');
  card.setVisibility(0);assert.equal(fade.value,0);assert.equal(card.points.visible,false);
  card.setVisibility(1);assert.equal(fade.value,1);assert.equal(card.points.visible,true);
  const cloud=createProfileParticleMaterial(buildProfileParticleArrays(),uniforms);
  assert.equal(nodes(cloud.colorNode).has(uniforms.cloudVisibility),false,'opaque cloud does not darken during takeover');
  assert.equal(nodes(cloud.sizeNode).has(uniforms.cloudVisibility),true,'cloud fades by covered area');
  cloud.dispose();card.dispose();
});

test('each CRT dot lands on a deterministic source particle at both bookends',()=>{
  const bytes=readFileSync(new URL('../../public/particles/profile/scene.bin',import.meta.url));
  const cache=decodeProfileCache(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),manifest.pointCount,manifest.model.groups.length);
  const arrays=buildProfileParticleArrays({model:manifest.model,cache});
  const shots=extendProfileShots(manifest.model.shots);
  for(const endpoint of [0,5]){
    const a=profileCardTargets(arrays,shots,2048,16/9,endpoint),b=profileCardTargets(arrays,shots,2048,16/9,endpoint);
    assert.deepEqual(a,b);assert.equal(a.length,2048);assert.equal(new Set(a).size,2048);
    assert.ok(a.every(id=>id<cache.groupIndices.length));
    if(endpoint===0)assert.ok(a.every(id=>arrays.motionA[id*4]>0),'opening pixels land on moving columns');
  }
  assert.equal(profileFlightHandoff(0),0);assert.equal(profileFlightHandoff(.72),0);assert.equal(profileFlightHandoff(1),1);
  assert.ok(profileFlightHandoff(.86)>.49&&profileFlightHandoff(.86)<.51);
});

test('all scroll pages remove the shared animated hazard separator',()=>{
  for(const path of ['../../src/scroll/ScrollPageShell.tsx','../../src/scroll/primitives.tsx','../../src/styles/scroll-pages.css'])
    assert.doesNotMatch(readFileSync(new URL(path,import.meta.url),'utf8'),/HazardRule|ark-hazard/);
});

test('shader bookend progress is reversible throughout the particle journey',()=>{
  assert.equal(profileCardMix({from:'hero',to:'student',progress:0}),1);
  assert.equal(profileCardMix({from:'hero',to:'student',progress:1}),0);
  assert.equal(profileCardMix({from:'links',to:'links',progress:0}),1);
  for(let t=0;t<=1;t+=.01){
    assert.ok(Math.abs(profileCardMix({from:'hero',to:'student',progress:t})+profileCardMix({from:'experiments',to:'links',progress:t})-1)<1e-9);
    assert.equal(profileCardMix({from:'student',to:'career',progress:t}),0);
  }
});

test('CRT dot grid stays bounded through desktop, portrait and 4K resizes',()=>{
  for(const [w,h] of [[1,1],[390,844],[1440,900],[3840,2160]]){
    const grid=createProfileCardGrid(w,h);
    assert.ok(grid.coordinates.length/2<=PROFILE_HALFTONE.maxDots);
    assert.ok(grid.coordinates.every(Number.isFinite));
    assert.ok(grid.spacing>=PROFILE_HALFTONE.spacing);
  }
  assert.ok(PROFILE_DIFFUSION.strength<.25);assert.ok(PROFILE_DIFFUSION.threshold>.5);
});

test('the unified Profile scene uses deterministic feathered ground below its source floor',()=>{
  const a=createProfileGround(manifest.model),b=createProfileGround(manifest.model);
  assert.ok(a.positions.length>0);assert.deepEqual(a.positions,b.positions);
  assert.ok(a.fades.some(x=>x>.8));assert.ok(a.fades.some(x=>x<.1));
  assert.ok(a.fades.every(x=>x>=0&&x<=1));
  assert.ok(a.positions.filter((_,i)=>i%3===1).every(y=>y===a.positions[1]));
  const columns=manifest.model.groups.filter(g=>g.kind==='height');
  assert.ok(Math.abs(a.positions[1]-(Math.min(...columns.map(g=>g.pivot[1]))-.002))<1e-6);
  assert.equal(a.fades.length,48000);
  let near=0,far=0,tail=0;
  for(let i=0;i<a.fades.length;i++){
    const distance=Math.min(...columns.map(g=>Math.hypot(a.positions[i*3]-g.pivot[0],a.positions[i*3+2]-g.pivot[2])));
    if(distance<.5)near++;
    if(distance>=.5&&distance<1)far++;
    if(distance>25){tail++;assert.ok(a.fades[i]<.0001);}
  }
  assert.ok(near>far/3,'density per square metre falls away from model');
  assert.ok(tail>500,'distant points fade before the field ends');
  assert.equal(GROUND_STYLE.diameterPixels,1.3);assert.equal(GROUND_STYLE.spacingPixels,4);
});
test('collective breathing remains slight and moves without pointer or scroll input',()=>{
  assert.notDeepEqual(profileBreathingOffset(0),profileBreathingOffset(3));
  for(let t=0;t<120;t+=.1){const [x,y]=profileBreathingOffset(t);assert.ok(Math.abs(x)<=PROFILE_BREATH.x);assert.ok(Math.abs(y)<=PROFILE_BREATH.y);}
  assert.ok(PROFILE_BREATH.y<=.006);
});

test('portal and auxiliary visibility cull sprite size as well as alpha, independent of MSAA coverage',()=>{
  const source=readFileSync(new URL('../../src/particles/profile/profileParticleMaterial.ts',import.meta.url),'utf8');
  assert.match(source,/mat\.alphaTest\s*=\s*\.001/);
  assert.match(source,/\.mul\(visibility\)/);
  assert.match(source,/\.mul\(varying\(visibility\)\)/);
  assert.match(source,/u\.eyeB\.z\.greaterThan\(u\.portalZ\)\.select\(float\(1\),portalMask\)/);
  assert.match(source,/aperture\.mul\(exteriorClear\)/);
});
