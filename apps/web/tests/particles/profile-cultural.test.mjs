import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CULTURAL,culturalCycle,culturalExtent,culturalFit,culturalVerticalOffset,decodeCultural} from '../../src/particles/profile/profileCultural.ts';
test('approved penguin remains intact and the other five scenes return to shallow photographic relief',()=>{
 const root=new URL('../../public/particles/profile/',import.meta.url),b=readFileSync(new URL('cultural.bin',root));
 const m=JSON.parse(readFileSync(new URL('cultural.json',root)));assert.equal(createHash('sha256').update(b).digest('hex'),m.sha256);
 assert.equal(createHash('sha256').update(b.subarray(16,16+48000*16)).digest('hex'),'bfddcfe4967f2ba88c19f61f7987f46cd603c57f1bf4107946d330e2988ccffe','approved penguin stays byte-identical');
 for(const scene of m.scenes.slice(1)){
   assert.equal(scene.triangleCount,undefined);assert.equal(scene.meshCount,undefined);
   assert.match(scene.method,/original shallow photographic relief/);
 }
 const scenes=decodeCultural(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));assert.equal(scenes.length,6);
 scenes.forEach((s,i)=>{assert.equal(s.positions.length,48000*3);assert.equal(s.colors.length,48000*4);assert.equal(m.scenes[i].name,`cultural${i+1}`);assert.match(m.scenes[i].sourceSha256,/^[a-f0-9]{64}$/);assert.ok(s.positions.every(v=>Math.abs(v)<3));
   const zs=s.positions.filter((_,j)=>j%3===2),alpha=s.colors.filter((_,j)=>j%4===3);
   const depthRange=Math.max(...zs)-Math.min(...zs);
   if(i===0){
     assert.ok(depthRange>2,'penguin keeps spatial depth');
     assert.ok(alpha.filter(v=>v<40).length>1500,'penguin soft outer tail');
   }else{
     assert.ok(depthRange>.08&&depthRange<.36,'photographs keep their original shallow depth');
     assert.ok(zs.every(z=>z>-.2&&z<.2),'no scattered or modelled depth layers');
     assert.ok(alpha.filter(v=>v<40).length>1500,'wide feather reaches near transparency');
     assert.ok(alpha.some(v=>v===0),'no alpha floor at the image edge');
   }
   assert.ok(alpha.filter(v=>v>180).length>5000,'readable subject core');
   const extent=culturalExtent(s,i);
   for(const aspect of [.6,1,16/9,2.4]){
     const fit=culturalFit(extent,aspect,i),x=extent[0]*fit/aspect,y=extent[1]*fit;
     if(i===0){assert.ok(x<=.800001&&y<=.800001);assert.ok(Math.abs(Math.max(x,y)-.8)<1e-6);assert.equal(culturalVerticalOffset(extent,fit,i),0);}
     else{assert.ok(x>=1.059999&&y>=1.059999,'relief covers both viewport axes');assert.ok(Math.abs(Math.min(x,y)-1.06)<1e-6);}
   }
 });
 assert.ok(m.scenes[0].environmentFraction<=.031,'water stays sparse');
 assert.throws(()=>decodeCultural(new ArrayBuffer(20)));
});
test('penguin keeps 30 degrees in five seconds; five reliefs turn 20 degrees in four seconds',()=>{
 const a=culturalCycle(0),b=culturalCycle(5),c=culturalCycle(5.6),d=culturalCycle(6.2);
 assert.equal(a.morph,0);assert.equal(b.morph,0);assert.ok(Math.abs(b.angle-a.angle-Math.PI/6)<1e-10);
 assert.ok(c.morph>.49&&c.morph<.51);assert.equal(d.index,1);assert.equal(d.morph,0);
 assert.ok(CULTURAL.localScatter*Math.sqrt(3)<.16);
 for(let i=1;i<6;i++){
   const start=6.2+(i-1)*5.2,from=culturalCycle(start+.000001),to=culturalCycle(start+4);
   assert.equal(from.index,i);assert.equal(to.index,i);
   assert.ok(Math.abs(to.angle-from.angle-Math.PI/9)<1e-6);
   assert.ok(culturalCycle(start+4.6).morph>.49&&culturalCycle(start+4.6).morph<.51);
   const next=culturalCycle(start+5.2+.000001);assert.equal(next.index,(i+1)%6);assert.ok(next.morph<1e-6);
 }
 assert.equal(culturalCycle(32.201).index,0);
});
