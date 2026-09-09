import type { ModelParticleArrays } from "./mergeParticleArrays.ts";

export const PARTICLE_DENSITY = {
  referenceHeight: 900, cellPixels: 4, samplesPerCell: 2, diameterPixels: 1.6, spacingRatio: .66,
} as const;

/** Mean nearest-neighbour distance of actual projected samples, using an exact
 * expanding spatial search. Cache points are never moved or synthesized. */
function meanSpacing(indices: number[], x: Float64Array, y: Float64Array): number {
  if (indices.length < 2) return 0;
  const size = 4, bins = new Map<string, number[]>();
  for (const i of indices) {
    const key = `${Math.floor(x[i] / size)},${Math.floor(y[i] / size)}`;
    const bin = bins.get(key) ?? []; bin.push(i); bins.set(key, bin);
  }
  let sum = 0;
  for (const i of indices) {
    const bx = Math.floor(x[i] / size), by = Math.floor(y[i] / size);
    let best = Infinity;
    for (let ring = 0; ; ring++) {
      for (let dx = -ring; dx <= ring; dx++) for (let dy = -ring; dy <= ring; dy++) {
        if (ring && Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
        for (const j of bins.get(`${bx + dx},${by + dy}`) ?? []) {
          if (j !== i) best = Math.min(best, (x[i] - x[j]) ** 2 + (y[i] - y[j]) ** 2);
        }
      }
      const margin = Math.min(x[i] - (bx - ring) * size, (bx + ring + 1) * size - x[i],
        y[i] - (by - ring) * size, (by + ring + 1) * size - y[i]);
      if (best <= margin * margin) break;
    }
    sum += Math.sqrt(best);
  }
  return sum / indices.length;
}

/** Calibrate against the previous 4px/two-sample field. A 66% distance request
 * is not a 1.5x point-count request; finite source coverage is measured directly. */
export function sampleProjectedDensity(model: ModelParticleArrays, distance: number, spacingRatio: number = PARTICLE_DENSITY.spacingRatio) {
  const { referenceHeight, samplesPerCell, diameterPixels } = PARTICLE_DENSITY;
  const focal = referenceHeight / (2 * Math.tan(Math.PI / 8));
  const elevation = Math.atan(.15), c = Math.cos(elevation), s = Math.sin(elevation);
  const x = new Float64Array(model.rands.length), y = new Float64Array(model.rands.length);
  const priorities = new Uint32Array(model.rands.length);
  for (let i = 0; i < model.rands.length; i++) {
    let hash = Math.floor(model.rands[i] * 0xffffffff) >>> 0;
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
    priorities[i] = (hash ^ (hash >>> 16)) >>> 0;
    const depth = Math.max(distance - model.positions[i * 3 + 1] * s - model.positions[i * 3 + 2] * c, distance * .01);
    x[i] = model.positions[i * 3] / depth * focal;
    y[i] = (model.positions[i * 3 + 1] * c - model.positions[i * 3 + 2] * s) / depth * focal;
  }
  const select = (cellPixels: number) => {
    const cells = new Map<string, number[]>();
    for (let i = 0; i < model.rands.length; i++) {
      const key = `${Math.floor(x[i] / cellPixels)},${Math.floor(y[i] / cellPixels)}`;
      const bin = cells.get(key) ?? [];
      if (!cells.has(key)) cells.set(key, bin);
      bin.push(i); bin.sort((a, b) => priorities[a] - priorities[b] || a - b);
      if (bin.length > samplesPerCell) bin.pop();
    }
    const indices = Array.from(cells.values()).flat().sort((a, b) => a - b);
    return { indices, occupiedCells: cells.size, cellPixels, meanSpacing: meanSpacing(indices, x, y) };
  };
  const baseline = select(PARTICLE_DENSITY.cellPixels);
  const target = baseline.meanSpacing * spacingRatio;
  let best = baseline;
  if (spacingRatio < 1 && target > 1e-8) {
    let low: number = .25, high: number = PARTICLE_DENSITY.cellPixels;
    for (let iteration = 0; iteration < 8; iteration++) {
      const candidate = select((low + high) / 2);
      if (Math.abs(candidate.meanSpacing - target) < Math.abs(best.meanSpacing - target)) best = candidate;
      if (candidate.meanSpacing > target) high = candidate.cellPixels; else low = candidate.cellPixels;
      if (Math.abs(best.meanSpacing / target - 1) < .005) break;
    }
  }
  const selected = best.indices, pointCount = selected.length;
  const positions = new Float32Array(pointCount * 3), normals = new Float32Array(pointCount * 3), rands = new Float32Array(pointCount);
  selected.forEach((source, index) => {
    positions.set(model.positions.subarray(source * 3, source * 3 + 3), index * 3);
    normals.set(model.normals.subarray(source * 3, source * 3 + 3), index * 3);
    rands[index] = model.rands[source];
  });
  return { positions, normals, rands, pointCount, occupiedCells: best.occupiedCells,
    cellPixels: best.cellPixels, meanSpacing: best.meanSpacing, baselineMeanSpacing: baseline.meanSpacing,
    projectedDensity: pointCount / Math.max(baseline.occupiedCells * PARTICLE_DENSITY.cellPixels ** 2, 1),
    pointSize: diameterPixels * 2 * distance / referenceHeight };
}
