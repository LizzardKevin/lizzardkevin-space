import type { ModelParticleArrays } from "./mergeParticleArrays.ts";

/** Canonical 900px-high view, independent of DPR, viewport and world scale.
 * Two samples per 4px cell limit overlapping surfaces as well as total count.
 * Membership is fixed at load time: resize/parallax never reshuffles particles.
 */
export const PARTICLE_DENSITY = { referenceHeight: 900, cellPixels: 4, samplesPerCell: 2, diameterPixels: 1.6 } as const;

export function sampleProjectedDensity(model: ModelParticleArrays, distance: number) {
  const { referenceHeight, cellPixels, samplesPerCell, diameterPixels } = PARTICLE_DENSITY;
  const focal = referenceHeight / (2 * Math.tan(Math.PI / 8));
  const elevation = Math.atan(.15), c = Math.cos(elevation), s = Math.sin(elevation);
  const cells = new Map<string, number[]>();
  const priorities = new Uint32Array(model.rands.length);
  // Hash the cache random value so selecting low priorities does not bias the
  // original random phase used by twinkle and intro shaders toward zero.
  for (let i = 0; i < model.rands.length; i++) {
    let hash = Math.floor(model.rands[i] * 0xffffffff) >>> 0;
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
    priorities[i] = (hash ^ (hash >>> 16)) >>> 0;
    const x = model.positions[i * 3], y = model.positions[i * 3 + 1], z = model.positions[i * 3 + 2];
    const depth = Math.max(distance - y * s - z * c, distance * .01);
    const key = `${Math.floor(x / depth * focal / cellPixels)},${Math.floor((y * c - z * s) / depth * focal / cellPixels)}`;
    const indices = cells.get(key) ?? [];
    if (!cells.has(key)) cells.set(key, indices);
    indices.push(i);
    indices.sort((a, b) => priorities[a] - priorities[b] || a - b);
    if (indices.length > samplesPerCell) indices.pop();
  }
  const selected = Array.from(cells.values()).flat().sort((a, b) => a - b);
  const pointCount = selected.length;
  const positions = new Float32Array(pointCount * 3), normals = new Float32Array(pointCount * 3), rands = new Float32Array(pointCount);
  selected.forEach((source, index) => {
    positions.set(model.positions.subarray(source * 3, source * 3 + 3), index * 3);
    normals.set(model.normals.subarray(source * 3, source * 3 + 3), index * 3);
    rands[index] = model.rands[source];
  });
  // Three Sprite size attenuation uses .5 * height/depth, without camera FOV.
  return { positions, normals, rands, pointCount, occupiedCells: cells.size,
    pointSize: diameterPixels * 2 * distance / referenceHeight };
}
