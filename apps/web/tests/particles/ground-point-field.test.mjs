import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { PerspectiveCamera, Vector3 } from "three";
import { buildModelParticleArrays } from "../../src/particles/mergeParticleArrays.ts";

const particlesDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/particles");

test("model calibration reduces measured projected neighbour distance to 66 percent",async()=>{
  const {sampleProjectedDensity}=await import('../../src/particles/projectedParticleDensity.ts');
  const count=14400,positions=new Float32Array(count*3),normals=new Float32Array(count*3),rands=new Float32Array(count);
  for(let i=0;i<count;i++){positions[i*3]=(i%120-60)*.006;positions[i*3+1]=(Math.floor(i/120)-60)*.006;rands[i]=(i*317%count)/count;}
  const model={positions,normals,rands};
  const before=sampleProjectedDensity(model,10,1),after=sampleProjectedDensity(model,10);
  assert.ok(after.pointCount>before.pointCount,'model must actually gain samples');
  assert.ok(Math.abs(after.meanSpacing/before.meanSpacing-.66)<.025,'measured mean spacing, not just grid size, must approach 66%');
});

test("ground density decreases with distance and its peak is capped by model density",async()=>{
  const {groundDensityAtDistance}=await import('../../src/particles/groundPointField.ts');
  assert.equal(typeof groundDensityAtDistance,'function');
  for(const modelDensity of [.015,.2,.4]){
    const levels=[0,50,150,400,1000].map(d=>groundDensityAtDistance(d,modelDensity));
    assert.ok(levels[0]<=modelDensity);
    levels.slice(1).forEach((v,i)=>assert.ok(v<levels[i]));
  }
});

test("ground and model share full cursor gain, size gain and jitter response",()=>{
  const material=readFileSync(resolve(particlesDir,'particlePointsMaterial.ts'),'utf8');
  assert.doesNotMatch(material,/cursorBoost\.mul\(\.2\)|viewDepth\.mul\(\.002\)/);
  assert.match(material,/cursorJitterAmp/);assert.match(material,/cursorSizeGain/);
});

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
    const inputMagnitude=Math.abs(original.positions[i]*transform.scale)+Math.abs(transform.shift[i%3])+Math.abs(resized.positions[i])+1;
    assert.ok(Math.abs(original.positions[i]*transform.scale+transform.shift[i%3]-resized.positions[i])<inputMagnitude*2e-7,'Float32 input error, including cancellation, must stay bounded');
    assert.ok(Math.abs(original.alts[i]*transform.scatterScale+transform.scatterShift[i%3]-resized.alts[i])<2e-5);
  }
});

test("extended ground boundary dissolves before its finite edge and remains inside the far clip",async()=>{
  const {createGroundPointField,GROUND_STYLE}=await import('../../src/particles/groundPointField.ts');
  const field=createGroundPointField(-4.2,12.588,1.5),camera=new PerspectiveCamera(45,1.6,.05,12.588*GROUND_STYLE.farClipFactor),e=Math.atan(.15);
  camera.position.set(-1.5,12.588*Math.sin(e),12.588*Math.cos(e));camera.lookAt(-1.5,0,0);camera.updateMatrixWorld();
  let edgePoints=0,maxU=0;
  for(let i=0;i<field.rands.length;i++){
    const p=new Vector3().fromArray(field.positions,i*3).project(camera),u=p.x*1.6;
    maxU=Math.max(maxU,Math.abs(u));assert.ok(p.z<1,'fading points must not hit a hard far clip');
    if(Math.abs(u)>7||p.y< -3.5){edgePoints++;assert.ok(field.fades[i]<.2);}
  }
  assert.ok(maxU>7&&edgePoints>0,'coverage must extend well beyond the old 3.2 boundary');
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
