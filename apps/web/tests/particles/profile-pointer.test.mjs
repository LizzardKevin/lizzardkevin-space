import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { PROFILE_POINTER, advanceProfilePointer, createProfilePointer, profileParallaxMatrix } from '../../src/particles/profile/profilePointer.ts';

test('Profile uses half of WorkDetail pointer angles and retains its damping',()=>{
  const work=readFileSync(new URL('../../src/particles/ParticlePointsRenderer.ts',import.meta.url),'utf8');
  assert.match(work,/CURSOR_LERP_PER_SEC = 8/);assert.match(work,/PARALLAX_LERP_PER_SEC = 3/);
  assert.match(work,/parallaxMaxAzimuth = MathUtils.degToRad\(30\)/);
  assert.match(work,/parallaxMaxElevation = MathUtils.degToRad\(15\)/);
  assert.equal(PROFILE_POINTER.azimuth,Math.PI/12);assert.equal(PROFILE_POINTER.elevation,Math.PI/24);
  assert.equal(PROFILE_POINTER.cursorDamping,8);assert.equal(PROFILE_POINTER.parallaxDamping,3);
});
test('pointer orbit is smoothed, bounded, directional and returns to rest',()=>{
  const p=createProfilePointer();p.targetX=1;p.targetY=1;
  advanceProfilePointer(p,1/60);assert.ok(p.azimuth<0&&p.azimuth>-Math.PI/12);assert.ok(p.elevation>0&&p.elevation<Math.PI/24);
  for(let i=0;i<500;i++)advanceProfilePointer(p,1/60);
  assert.ok(Math.abs(p.azimuth+Math.PI/12)<1e-6);assert.ok(Math.abs(p.elevation-Math.PI/24)<1e-6);
  p.targetX=10;p.targetY=10;for(let i=0;i<500;i++)advanceProfilePointer(p,1/60);
  assert.ok(Math.abs(p.azimuth)<1e-6&&Math.abs(p.elevation)<1e-6);
});
test('orbit preserves its focus point and is identity at rest',()=>{
  const identity=profileParallaxMatrix(0,0,3);
  assert.deepEqual(new Vector3(1,2,-4).applyMatrix4(identity).toArray(),[1,2,-4]);
  const orbit=profileParallaxMatrix(-.2,.1,3),focus=new Vector3(0,0,-3).applyMatrix4(orbit);
  assert.ok(focus.distanceTo(new Vector3(0,0,-3))<1e-10);
  assert.ok(Math.abs(orbit.determinant()-1)<1e-10);
});
