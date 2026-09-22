import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveProfileTimeline} from '../../src/particles/profile/profileTimeline.ts';

const stages=['hero','student','career','photo','band','culture','experiments','links'];
const stops=stages.map((stage,i)=>({stage,offset:i*800}));

test('all six chapters traverse the same camera sequence monotonically',()=>{
 const expected=[0,0,1,2,3,4,5,5];
 stops.forEach((stop,i)=>assert.equal(resolveProfileTimeline(stop.offset,stops).cameraProgress,expected[i]));
 let previous=0;
 for(let scroll=0;scroll<=5600;scroll+=7){
  const state=resolveProfileTimeline(scroll,stops);
  assert.ok(state.cameraProgress>=previous&&state.cameraProgress<=5);
  assert.deepEqual(Object.keys(state).sort(),['cameraProgress','from','motionTime','progress','to','viewOffset']);
  previous=state.cameraProgress;
 }
});

test('scroll is reversible and stationary input never advances the scene',()=>{
 const forward=Array.from({length:57},(_,i)=>resolveProfileTimeline(i*100,stops));
 assert.deepEqual([...forward].reverse(),Array.from({length:57},(_,i)=>resolveProfileTimeline(5600-i*100,stops)));
 assert.deepEqual(resolveProfileTimeline(1320,stops),resolveProfileTimeline(1320,stops));
});

test('document extremes and nonfinite scroll retain a finite camera pose',()=>{
 for(const scroll of [-100,0,99999,NaN,Infinity]){
  const state=resolveProfileTimeline(scroll,stops);
  assert.ok(Number.isFinite(state.cameraProgress)&&state.cameraProgress>=0&&state.cameraProgress<=5);
  assert.ok(Number.isFinite(state.motionTime));
 }
 assert.equal(resolveProfileTimeline(-100,stops).cameraProgress,0);
 assert.equal(resolveProfileTimeline(99999,stops).cameraProgress,5);
 assert.equal(resolveProfileTimeline(0,[]).cameraProgress,0);
});

test('compact chapter reading holds preserve each of the six exact camera endpoints',()=>{
 const heldStops=stages.map((stage,i)=>({stage,offset:i*960}));
 for(let index=1;index<=6;index++){
  for(let delta=-96;delta<=96;delta+=12){
   const state=resolveProfileTimeline(heldStops[index].offset+delta,heldStops,800);
   assert.equal(state.cameraProgress,index-1);
   assert.equal(state.viewOffset,index%2===1?.2:-.2);
  }
 }
});

test('every chapter transition eases camera motion to zero slope at both endpoints',()=>{
 for(let index=1;index<6;index++){
  const start=index*800,end=start+800,epsilon=.1;
  assert.ok(Math.abs(resolveProfileTimeline(start+epsilon,stops).cameraProgress-resolveProfileTimeline(start,stops).cameraProgress)<1e-6);
  assert.ok(Math.abs(resolveProfileTimeline(end-epsilon,stops).cameraProgress-resolveProfileTimeline(end,stops).cameraProgress)<1e-6);
  assert.equal(resolveProfileTimeline(start+400,stops).cameraProgress,index-.5);
 }
});
