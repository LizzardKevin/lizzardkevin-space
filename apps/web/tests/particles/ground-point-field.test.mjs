import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { PerspectiveCamera, Vector3 } from "three";
import { buildModelParticleArrays } from "../../src/particles/mergeParticleArrays.ts";

const particlesDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/particles");

test("projected density uses deterministic spatial sampling instead of equal point counts", async () => {
  assert.ok(existsSync(resolve(particlesDir, 'projectedParticleDensity.ts')), 'projected density sampler required');
  const { sampleProjectedDensity } = await import('../../src/particles/projectedParticleDensity.ts');
  const positions = new Float32Array(3000), normals = new Float32Array(3000), rands = new Float32Array(1000);
  for(let i=0;i<1000;i++) {positions[i*3]=(i%10)/10;positions[i*3+1]=Math.floor(i/100)%10/10;rands[i]=(i*37%1000)/1000;}
  const first=sampleProjectedDensity({positions,normals,rands}, 10);
  const second=sampleProjectedDensity({positions,normals,rands}, 10);
  assert.deepEqual(first.positions,second.positions);
  assert.ok(first.pointCount < 1000, 'coincident projections must not pile up');
  assert.ok(first.pointCount <= first.occupiedCells*2);
  const scaled=sampleProjectedDensity({positions:positions.map(x=>x*3),normals,rands},30);
  assert.equal(first.pointCount,scaled.pointCount,'world model scale must not change projected density');
  assert.ok(Math.abs(scaled.pointSize / first.pointSize - 3)<1e-6);
});

test("ground points have deterministic off-plane targets and share the model morph buffers", async () => {
  assert.ok(existsSync(resolve(particlesDir, 'groundPointField.ts')), 'ground field must be restored');
  const { createGroundPointField } = await import('../../src/particles/groundPointField.ts');
  const field = createGroundPointField(-4.2, 12.588, 1.5);
  const again = createGroundPointField(-4.2, 12.588, 1.5);
  assert.deepEqual(field.positions, again.positions);
  assert.deepEqual(field.alts, again.alts);
  for(let i=0;i<field.rands.length;i++) {
    assert.ok(Math.abs(field.positions[i*3+1]+4.2)<1e-5);
    assert.ok(Math.abs(field.alts[i*3+1]-field.positions[i*3+1])>1e-7,'targets must not be a retained floor plane');
    assert.ok(Math.hypot(...field.alts.subarray(i*3,i*3+3).map((v,a)=>v-field.positions[i*3+a]))>1e-3,'no ground point remains static');
  }
  const model={positions:new Float32Array([1,2,3]),normals:new Float32Array([0,1,0]),rands:new Float32Array([.5])};
  const merged=buildModelParticleArrays(model,1,{positions:new Float32Array([10,20,30])},field);
  assert.equal(merged.totalCount,1+field.rands.length);
  assert.deepEqual(merged.alts.subarray(3),field.alts);
  assert.equal(merged.groundWeights[0],0);
  assert.ok(merged.groundWeights.subarray(1).every(v=>v===1));
});

test("ground reframing preserves both projected layouts without regenerating buffers", async()=>{
  const { createGroundPointField, groundFrameTransform } = await import('../../src/particles/groundPointField.ts');
  assert.equal(typeof groundFrameTransform,'function');
  const original=createGroundPointField(-4.2,12.588,1.5);
  const resized=createGroundPointField(-4.2,21,1.5);
  const transform=groundFrameTransform(-4.2,12.588,21,1.5);
  for(let i=0;i<original.rands.length*3;i+=17){
    assert.ok(Math.abs(original.positions[i]*transform.scale+transform.shift[i%3]-resized.positions[i])<2e-5);
    assert.ok(Math.abs(original.alts[i]*transform.scatterScale+transform.scatterShift[i%3]-resized.alts[i])<2e-5);
  }
});

test("ground projected spacing stays identical across the three works, including scatter", async()=>{
  assert.ok(existsSync(resolve(particlesDir, 'groundPointField.ts')), 'projected ground sampler required');
  const { createGroundPointField } = await import('../../src/particles/groundPointField.ts');
  const works=[{d:12.58784,y:-4.1833},{d:13.35293,y:-1.17925},{d:1.89496,y:-.201737}];
  let reference;
  for(const {d,y} of works){
    const offset=d*.119;
    const field=createGroundPointField(y,d,offset);
    const camera=new PerspectiveCamera(45,1440/900,.01,d*10),e=Math.atan(.15);
    camera.position.set(-offset,d*Math.sin(e),d*Math.cos(e));camera.lookAt(-offset,0,0);camera.updateMatrixWorld();
    const projected=[];
    for(let i=0;i<field.rands.length;i+=19){
      for(const array of [field.positions,field.alts]){
        const p=new Vector3().fromArray(array,i*3).project(camera);
        projected.push(p.x,p.y);
      }
    }
    if(reference) projected.forEach((v,i)=>assert.ok(Math.abs(v-reference[i])<1e-5,'ground screen distribution must not depend on model scale/height'));
    reference=projected;
  }
});

test("renderer includes morphing ground in the existing particle layer", () => {
  const renderer = readFileSync(resolve(particlesDir, "ParticlePointsRenderer.ts"), "utf8").replace(
    /\r\n/g,
    "\n",
  );
  assert.match(renderer, /createGroundPointField/);
  assert.match(renderer, /groundWeights: merged.groundWeights/);
});
