export type ModelParticleArrays = {
  positions: Float32Array;
  normals: Float32Array;
  rands: Float32Array;
};

/** Every rendered point belongs to the model and receives an ambient target. */
export function buildModelParticleArrays(
  model: ModelParticleArrays,
  modelCount: number,
  ambient: { positions: Float32Array },
) {
  if (ambient.positions.length < modelCount * 3) {
    throw new Error(`Ambient field too small (${ambient.positions.length / 3} points < ${modelCount} model points)`);
  }
  return {
    positions: model.positions.subarray(0, modelCount * 3),
    normals: model.normals.subarray(0, modelCount * 3),
    rands: model.rands.subarray(0, modelCount),
    fades: new Float32Array(modelCount).fill(1),
    alts: ambient.positions.subarray(0, modelCount * 3),
    totalCount: modelCount,
  };
}
