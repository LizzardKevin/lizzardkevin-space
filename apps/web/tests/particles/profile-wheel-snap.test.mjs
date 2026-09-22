import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfileWheelGesture,sampleProfileWheel,resolveProfileSnapTarget} from '../../src/pages/profile/profileWheelSnap.ts';

test('slow ticks and even very large single wheel events never arm snapping',()=>{
  const wheel=createProfileWheelGesture();
  for(let t=0;t<2000;t+=300)assert.equal(sampleProfileWheel(wheel,t,10000,t),false);
});
test('the tenth same-direction event within 200ms arms regardless of distance',()=>{
  for(const delta of [.01,10000,-.01,-10000]){
    const g=createProfileWheelGesture();
    for(let i=0;i<9;i++)assert.equal(sampleProfileWheel(g,i*20,delta,1000),false);
    assert.equal(sampleProfileWheel(g,200,delta,1100),true);assert.equal(g.start,1000);
  }
  const expired=createProfileWheelGesture();
  for(let i=0;i<9;i++)sampleProfileWheel(expired,i*20,10,0);
  assert.equal(sampleProfileWheel(expired,201,10,0),false);
});
test('direction reversal and a fresh slow gesture reset an armed burst',()=>{
  const g=createProfileWheelGesture();
  for(let i=0;i<10;i++)sampleProfileWheel(g,i*10,100,1000);
  assert.equal(g.fast,true);
  assert.equal(sampleProfileWheel(g,100,-20,1100),false);assert.equal(g.direction,-1);assert.equal(g.start,1100);
  for(let i=1;i<10;i++)sampleProfileWheel(g,100+i*10,-1,1090);
  assert.equal(g.fast,true);
  assert.equal(sampleProfileWheel(g,500,-30,1000),false);
});
test('snap lands on the nearest intended reading center in the gesture direction',()=>{
  const centers=[0,800,1760,2720,3680];
  assert.equal(resolveProfileSnapTarget(centers,1250,1,800),1760);
  assert.equal(resolveProfileSnapTarget(centers,3000,1,800),2720);
  assert.equal(resolveProfileSnapTarget(centers,2260,-1,2720),1760);
  assert.equal(resolveProfileSnapTarget(centers,900,-1,2720),800);
  assert.equal(resolveProfileSnapTarget(centers,0,-1,0),0);
  assert.equal(resolveProfileSnapTarget([],800,1,0),null);
});
