import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildProfileParticleArrays } from '../../src/particles/profile/profileParticleArrays.ts';
import {
  decodeProfileCache,
  fetchProfileModel,
  fetchProfileExterior,
  PROFILE_POINT_COUNT,
  validateProfileManifest,
} from '../../src/particles/profile/profileCache.ts';

const assetRoot = new URL('../../public/particles/profile/', import.meta.url);
const manifest = validateProfileManifest(JSON.parse(readFileSync(new URL('manifest.json', assetRoot), 'utf8')));
const scene = manifest.model;
const exterior = manifest.exterior;

test('manifest rejects missing or nonfinite pointer-orbit targets',()=>{
  for(const rawTarget of [undefined,[0,1],[0,NaN,1],[0,Infinity,1]]){
    const malformed=structuredClone(manifest);
    malformed.model.shots[0].rawTarget=rawTarget;
    assert.throws(()=>validateProfileManifest(malformed),/Invalid Profile camera target/);
  }
});

function modelBuffer(model) {
  const bytes = readFileSync(new URL(model.url, assetRoot));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('the exterior loads independently while the unified scene response is pending', async t => {
  const slowResponse = deferred();
  const requested = [];
  t.mock.method(globalThis, 'fetch', async url => {
    requested.push(String(url));
    if (String(url).endsWith('scene.bin')) return slowResponse.promise;
    assert.ok(String(url).endsWith('dumbo.bin'));
    return { ok: true, arrayBuffer: async () => modelBuffer(exterior) };
  });
  const controller = new AbortController();
  let sceneSettled = false;
  const slowLoad = fetchProfileModel(scene, controller.signal)
    .finally(() => { sceneSettled = true; });
  try {
    const healthy = await fetchProfileExterior(exterior, controller.signal);
    assert.equal(healthy.exterior.id, 'dumbo');
    assert.equal(healthy.cache.positions.length, exterior.pointCount * 3);
    assert.equal(sceneSettled, false);
    assert.equal(requested.length, 2);
  } finally {
    slowResponse.resolve({ ok: true, arrayBuffer: async () => modelBuffer(scene) });
    await slowLoad;
  }
});

test('aborting after headers prevents a late body from delivering stale model data', async t => {
  const bodyStarted = deferred();
  const body = deferred();
  let transportSignal;
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    transportSignal = options.signal;
    return {
      ok: true,
      arrayBuffer: () => {
        bodyStarted.resolve();
        // Deliberately ignore transport abort to exercise the post-body guard.
        return body.promise;
      },
    };
  });
  const controller = new AbortController();
  let delivered = false;
  const load = fetchProfileModel(scene, controller.signal)
    .then(value => { delivered = true; return value; });
  await bodyStarted.promise;
  const reason = new DOMException('Profile host disposed', 'AbortError');
  controller.abort(reason);
  assert.equal(transportSignal.aborted, true);
  const rejected = assert.rejects(load, error => error === reason);
  body.resolve(modelBuffer(scene));
  await rejected;
  assert.equal(delivered, false);
});

test('a failed exterior does not block the unified scene', async t => {
  t.mock.method(globalThis, 'fetch', async url => String(url).endsWith('dumbo.bin')
    ? { ok: false, status: 404 }
    : { ok: true, arrayBuffer: async () => modelBuffer(scene) });
  const controller = new AbortController();
  const missing = assert.rejects(fetchProfileExterior(exterior, controller.signal), /Profile exterior HTTP 404/);
  const healthy = await fetchProfileModel(scene, controller.signal);
  await missing;
  assert.equal(healthy.model.id, 'profile');
});

test('the 20-second deadline aborts a pending transport without aborting the host', async t => {
  const deadline = new AbortController();
  const started = deferred();
  t.mock.method(AbortSignal, 'timeout', milliseconds => {
    assert.equal(milliseconds, 20_000);
    return deadline.signal;
  });
  t.mock.method(globalThis, 'fetch', (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    started.resolve();
  }));
  const host = new AbortController();
  const load = fetchProfileModel(scene, host.signal);
  await started.promise;
  const reason = new DOMException('Profile download timed out', 'TimeoutError');
  const rejected = assert.rejects(load, error => error === reason);
  deadline.abort(reason);
  await rejected;
  assert.equal(host.signal.aborted, false);
});

test('the unified cache retains its 270k budget, hash, bounds and every authored motion group', () => {
  assert.equal(PROFILE_POINT_COUNT, 270_000);
  assert.equal(manifest.version,2);
  const model=scene;
    const buffer = modelBuffer(model);
    assert.equal(buffer.byteLength, model.byteLength);
    assert.equal(createHash('sha256').update(new Uint8Array(buffer)).digest('hex'), model.sha256);
    const decoded = decodeProfileCache(buffer, PROFILE_POINT_COUNT, model.groups.length);
    const counts = new Uint32Array(model.groups.length);
    assert.equal(decoded.groupIndices.length, PROFILE_POINT_COUNT);
    for (let i = 0; i < PROFILE_POINT_COUNT; i++) {
      counts[decoded.groupIndices[i]]++;
      let squaredNormalLength = 0;
      for (let axis = 0; axis < 3; axis++) {
        const coordinate = decoded.positions[i * 3 + axis];
        assert.ok(coordinate >= model.bounds[0][axis] - 1e-6 && coordinate <= model.bounds[1][axis] + 1e-6);
        squaredNormalLength += decoded.normals[i * 3 + axis] ** 2;
      }
      assert.ok(Math.abs(Math.sqrt(squaredNormalLength) - 1) < 0.00004);
    }
    for (const group of model.groups) {
      assert.ok(counts[group.index] > 0, `${model.id}: missing group ${group.index}`);
      assert.equal(counts[group.index], group.pointCount);
    }
    const moving = model.groups.filter(group => group.kind !== 'static');
    assert.equal(moving.filter(group=>group.kind==='height').length,72);
    assert.equal(moving.filter(group=>group.kind==='crowd').length,117);
    assert.equal(new Set(moving.map(group => group.sourceObjectId)).size, moving.length);
});

test('source allocations preserve all columns and weighted venue details within fixed budgets',()=>{
  const sampling=scene.sampling,allocations=sampling.objectAllocations;
  const columns=scene.groups.filter(group=>group.kind==='height');
  assert.equal(columns.reduce((total,group)=>total+group.pointCount,0),135_000);
  assert.ok(columns.every(group=>group.pointCount===1875));
  assert.equal(allocations.reduce((total,object)=>total+object.pointCount,0),270_000);
  assert.equal(allocations.length,sampling.renderedObjects);
  assert.equal(sampling.sampledObjects,sampling.renderedObjects);
  assert.ok(allocations.every(object=>object.pointCount>0));
  assert.match(scene.sourceSha256,/^[a-f0-9]{64}$/);
  assert.match(sampling.inventorySha256,/^[a-f0-9]{64}$/);
  assert.match(sampling.meshSha256,/^[a-f0-9]{64}$/);
  for(const [name,weight,count] of [['stage-truss',6,194],['line-array-loudspeakers',10,16],['people',8,117]]){
    const region=sampling.detailRegions.find(region=>region.name===name);
    assert.equal(region.weight,weight);assert.equal(region.objectCount,count);
    assert.ok(region.pointCount>region.uniformVenuePointCount);
  }
  const crowd=allocations.filter(object=>scene.groups[object.motionGroupIndex].kind==='crowd');
  assert.equal(crowd.length,117);assert.ok(crowd.every(object=>object.surfaceWeight===8));
});

test('render arrays retain source particle IDs and separate column and crowd motion in one scene',()=>{
  const cache=decodeProfileCache(modelBuffer(scene),PROFILE_POINT_COUNT,scene.groups.length);
  const exteriorCache=decodeProfileCache(modelBuffer(exterior),exterior.pointCount,1);
  const arrays=buildProfileParticleArrays({model:scene,cache},{exterior,cache:exteriorCache});
  assert.equal(arrays.count,PROFILE_POINT_COUNT+arrays.groundCount+exterior.pointCount);
  for(let i=0;i<PROFILE_POINT_COUNT;i++){
    const offset=i*4,group=scene.groups[cache.groupIndices[i]];
    for(let axis=0;axis<3;axis++)assert.equal(arrays.a[offset+axis],cache.positions[i*3+axis]);
    assert.equal(arrays.control[offset+3],0,'source geometry keeps its source membership');
    if(group.kind==='height'){
      assert.ok(arrays.motionA[offset]>0);assert.equal(arrays.motionB[offset],0);
    }else if(group.kind==='crowd'){
      assert.equal(arrays.motionA[offset],0);
      assert.equal(arrays.motionB[offset],Math.fround(group.amplitude[0]));
      assert.equal(arrays.motionB[offset+1],Math.fround(group.amplitude[1]));
    }else{
      assert.equal(arrays.motionA[offset],0);assert.equal(arrays.motionB[offset],0);
    }
  }
  for(let i=0;i<exterior.pointCount;i++){
    const offset=(PROFILE_POINT_COUNT+arrays.groundCount+i)*4;
    assert.equal(arrays.control[offset+3],2);
    for(let axis=0;axis<3;axis++)assert.equal(arrays.a[offset+axis],exteriorCache.positions[i*3+axis]);
  }
});

test('DUMBO supplemental geometry stays beyond the real window and has a fixed point budget',()=>{
  const e=manifest.exterior;assert.equal(e?.id,'dumbo');assert.equal(e.pointCount,45_000);
  const bytes=readFileSync(new URL(e.url,assetRoot));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),e.sha256);
  const data=decodeProfileCache(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),e.pointCount,1);
  assert.ok(data.groupIndices.every(g=>g===0));
  for(let i=2;i<data.positions.length;i+=3)assert.ok(data.positions[i]>e.portal.z);
  assert.ok(e.portal.xMin<e.portal.xMax&&e.portal.yMin<e.portal.yMax);
});
