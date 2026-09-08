import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

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

test("renderer has no independent static ground field", () => {
  const renderer = readFileSync(resolve(particlesDir, "ParticlePointsRenderer.ts"), "utf8").replace(
    /\r\n/g,
    "\n",
  );
  assert.doesNotMatch(renderer, /createGroundPointField|groundEnabled|mergeModelAndGround/);
});
