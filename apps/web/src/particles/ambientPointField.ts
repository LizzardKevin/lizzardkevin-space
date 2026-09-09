/**
 * 环境(ambient)解构目标点场:模型点 morphProgress→1 时的落点。
 * 以原点为中心的大范围扁平散布(x/z ±26,y ∈ [-4.2, 12],均匀采样),
 * 运行时确定性生成(mulberry32,与地面点场共用 PRNG),不占离线缓存格式。
 */

import { mulberry32 } from "./seededRandom.ts";

const AMBIENT_EXTENT_XZ = 26;
const AMBIENT_Y_MIN = -4.2;
const AMBIENT_Y_MAX = 12;
const AMBIENT_SEED = 0x5eed02;

export type AmbientPointField = {
  /** xyz 交错,3N。 */
  positions: Float32Array;
};

/** 生成以原点为中心的大范围扁平散布点场(仅位置,作为 morph 目标)。 */
export function createAmbientPointField(
  pointCount: number,
  seed: number = AMBIENT_SEED,
): AmbientPointField {
  const rand = mulberry32(seed);
  const positions = new Float32Array(pointCount * 3);
  for (let i = 0; i < pointCount; i += 1) {
    positions[i * 3] = (rand() * 2 - 1) * AMBIENT_EXTENT_XZ;
    positions[i * 3 + 1] = AMBIENT_Y_MIN + rand() * (AMBIENT_Y_MAX - AMBIENT_Y_MIN);
    positions[i * 3 + 2] = (rand() * 2 - 1) * AMBIENT_EXTENT_XZ;
  }
  return { positions };
}

export const AMBIENT_DEFAULTS = {
  extentXz: AMBIENT_EXTENT_XZ,
  yMin: AMBIENT_Y_MIN,
  yMax: AMBIENT_Y_MAX,
} as const;
