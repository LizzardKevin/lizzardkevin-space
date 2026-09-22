import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeProfileCache } from '../../src/particles/profile/profileCache.ts';
function cache(){const b=new ArrayBuffer(16+20*2),v=new DataView(b);new Uint8Array(b).set([80,86,82,49]);v.setUint32(4,2,true);v.setUint32(8,1,true);new Float32Array(b,16,6).set([1,2,3,4,5,6]);new Int16Array(b,40,6).set([0,32767,0,32767,0,0]);new Uint16Array(b,52,2).set([0,1]);return b;}
test('cache decodes ordered particle IDs, quantized normals and groups',()=>{
 const d=decodeProfileCache(cache(),2,2);assert.deepEqual([...d.positions],[1,2,3,4,5,6]);assert.deepEqual([...d.groupIndices],[0,1]);assert.deepEqual([...d.normals],[0,1,0,1,0,0]);
});
test('invalid lengths, headers, nonfinite coordinates and unknown groups fail',()=>{
 assert.throws(()=>decodeProfileCache(new ArrayBuffer(5),2,2));
 let b=cache();new Uint8Array(b)[0]=0;assert.throws(()=>decodeProfileCache(b,2,2));
 b=cache();new Float32Array(b,16,6)[0]=NaN;assert.throws(()=>decodeProfileCache(b,2,2));
 b=cache();new Uint16Array(b,52,2)[1]=2;assert.throws(()=>decodeProfileCache(b,2,2));
 assert.throws(()=>decodeProfileCache(cache(),3,2));
});
