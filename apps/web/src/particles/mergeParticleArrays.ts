/**
 * 模型点 + 地面点合并成一批 instanced attribute 数组(纯函数,便于 Node 单测)。
 *
 * 布局:前 modelCount 个是模型点(fades=1,alts=ambient 解构目标),
 * 后段是地面点(fades 径向衰减,alts=自身位置即不参与 morph)。
 * renderer 与测试共用这一份合并逻辑。
 */

export type ModelParticleArrays = {
  /** xyz 交错,3N(已做体积中心归零)。 */
  positions: Float32Array;
  /** xyz 交错,3N。 */
  normals: Float32Array;
  /** 每点 0..1,N。 */
  rands: Float32Array;
};

export type GroundParticleArrays = ModelParticleArrays & {
  /** 径向亮度衰减 0..1,N。 */
  fades: Float32Array;
};

export type MergedParticleArrays = ModelParticleArrays &
  GroundParticleArrays & {
    /** 每点解构目标位置 xyz 交错,3N:模型段=ambient 散布,地面段=自身位置。 */
    alts: Float32Array;
    /** 模型点数 + 地面点数。 */
    totalCount: number;
  };

/**
 * 合并模型点与(可选)地面点。ambient.positions 长度必须 ≥ modelCount × 3,
 * 模型点逐点取 ambient 前 N 个作为解构目标。
 */
export function mergeModelAndGround(
  model: ModelParticleArrays,
  modelCount: number,
  ground: GroundParticleArrays | null,
  ambient: { positions: Float32Array },
): MergedParticleArrays {
  if (ambient.positions.length < modelCount * 3) {
    throw new Error(
      `Ambient field too small (${ambient.positions.length / 3} points < ${modelCount} model points)`,
    );
  }
  const groundCount = ground ? ground.positions.length / 3 : 0;
  const totalCount = modelCount + groundCount;
  const positions = new Float32Array(totalCount * 3);
  const normals = new Float32Array(totalCount * 3);
  const rands = new Float32Array(totalCount);
  const fades = new Float32Array(totalCount);
  const alts = new Float32Array(totalCount * 3);

  positions.set(model.positions.subarray(0, modelCount * 3));
  normals.set(model.normals.subarray(0, modelCount * 3));
  rands.set(model.rands.subarray(0, modelCount));
  fades.fill(1, 0, modelCount);
  alts.set(ambient.positions.subarray(0, modelCount * 3));

  if (ground) {
    positions.set(ground.positions.subarray(0, groundCount * 3), modelCount * 3);
    normals.set(ground.normals.subarray(0, groundCount * 3), modelCount * 3);
    rands.set(ground.rands.subarray(0, groundCount), modelCount);
    fades.set(ground.fades.subarray(0, groundCount), modelCount);
    // 地面点不参与 morph:解构目标 = 自身位置。
    alts.set(ground.positions.subarray(0, groundCount * 3), modelCount * 3);
  }

  return { positions, normals, rands, fades, alts, totalCount };
}
