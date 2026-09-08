import type { GroundPointField } from "./groundPointField.ts";

export type ModelParticleArrays = {
  positions: Float32Array;
  normals: Float32Array;
  rands: Float32Array;
};

/** Model and floor share one draw and one morph/intro/exit progress. */
export function buildModelParticleArrays(
  model: ModelParticleArrays,
  modelCount: number,
  ambient: { positions: Float32Array },
  ground?: GroundPointField,
) {
  if (ambient.positions.length < modelCount * 3) {
    throw new Error(`Ambient field too small (${ambient.positions.length / 3} points < ${modelCount} model points)`);
  }
  const totalCount = modelCount + (ground?.rands.length ?? 0);
  const positions = new Float32Array(totalCount * 3), normals = new Float32Array(totalCount * 3);
  const rands = new Float32Array(totalCount), fades = new Float32Array(totalCount).fill(1);
  const alts = new Float32Array(totalCount * 3), groundWeights = new Float32Array(totalCount);
  positions.set(model.positions.subarray(0, modelCount * 3));
  normals.set(model.normals.subarray(0, modelCount * 3));
  rands.set(model.rands.subarray(0, modelCount));
  alts.set(ambient.positions.subarray(0, modelCount * 3));
  if (ground) {
    positions.set(ground.positions, modelCount * 3);
    normals.set(ground.normals, modelCount * 3);
    rands.set(ground.rands, modelCount);
    fades.set(ground.fades, modelCount);
    alts.set(ground.alts, modelCount * 3);
    groundWeights.fill(1, modelCount);
  }
  return { positions, normals, rands, fades, alts, groundWeights, totalCount };
}
