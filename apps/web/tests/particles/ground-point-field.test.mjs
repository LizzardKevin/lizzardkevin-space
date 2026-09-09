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

test("ground uses half of the shared feathered circular cursor response",()=>{
  const material=readFileSync(resolve(particlesDir,'particlePointsMaterial.ts'),'utf8');
  assert.match(material,/screenSize\.x\.div\(screenSize\.y\)/);
  assert.match(material,/exp\(/);
  assert.match(material,/mix\(float\(1\), float\(\.5\), groundWeight\)/);
  assert.match(material,/cursorGain\.mul\(cursorResponse\)/);
  assert.match(material,/cursorJitter\.mul\(cursorResponse\)/);
  assert.match(material,/cursorSizeGain\.mul\(cursorResponse\)/);
});

test("ground radial density reaches zero and every point belongs to a model-centered disk",async()=>{
  const {createGroundPointField,groundDensityAtDistance}=await import('../../src/particles/groundPointField.ts');
  const radius=20;
  assert.equal(groundDensityAtDistance(radius,.2,radius),0);
  assert.equal(groundDensityAtDistance(radius*2,.2,radius),0);
  assert.ok(groundDensityAtDistance(radius*.9,.2,radius)<.001);
  const field=createGroundPointField(-4.2,12.588,1.5,{radius});
  assert.ok(field.rands.length>1000);
  for(let i=0;i<field.rands.length;i++) assert.ok(Math.hypot(field.positions[i*3],field.positions[i*3+2])<radius);
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

test("ground reframing leaves the circular center and membership anchored to the model", async()=>{
  const { groundFrameTransform } = await import('../../src/particles/groundPointField.ts');
  for(const distance of [8,21,40]){
    const transform=groundFrameTransform(-4.2,12.588,distance,1.5);
    assert.equal(transform.scale,1);
    assert.deepEqual(transform.shift,[0,0,0]);
    assert.equal(transform.scatterScale,distance/12.588);
  }
});

test("ground circular rim thins smoothly to zero without a clipped far edge",async()=>{
  const {createGroundPointField,GROUND_STYLE,groundDensityAtDistance}=await import('../../src/particles/groundPointField.ts');
  const radius=25,field=createGroundPointField(-4.2,12.588,1.5,{radius});
  const camera=new PerspectiveCamera(45,1.6,.05,12.588*GROUND_STYLE.farClipFactor),e=Math.atan(.15);
  camera.position.set(-1.5,12.588*Math.sin(e),12.588*Math.cos(e));camera.lookAt(-1.5,0,0);camera.updateMatrixWorld();
  let rim=0;
  for(let i=0;i<field.rands.length;i++){
    const p=new Vector3().fromArray(field.positions,i*3);
    const radial=Math.hypot(p.x,p.z)/radius;
    assert.ok(p.project(camera).z<1);
    if(radial>.9){rim++;assert.ok(field.fades[i]<.27);}
  }
  assert.ok(rim>0);
  assert.ok(groundDensityAtDistance(radius*.99,.2,radius)<1e-6);
});

test("ground sampling is scale invariant across models with the same relative framing",async()=>{
  const {createGroundPointField}=await import('../../src/particles/groundPointField.ts');
  const first=createGroundPointField(-4,12,1.5,{radius:24});
  const scaled=createGroundPointField(-12,36,4.5,{radius:72});
  assert.equal(first.rands.length,scaled.rands.length);
  for(let i=0;i<first.positions.length;i+=19){
    assert.ok(Math.abs(first.positions[i]*3-scaled.positions[i])<2e-5);
    assert.ok(Math.abs(first.alts[i]*3-scaled.alts[i])<2e-5);
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
