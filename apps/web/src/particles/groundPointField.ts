/**
 * 程序化粒子地面(纯平圆盘),运行时确定性生成,不占用离线缓存格式。
 *
 * 设计:半径随取景视距归一化(radius = 视距 × GROUND_RADIUS_VIEW_FACTOR,
 * Tree Habitat 现状 60/12.6 ≈ 4.76),圆盘角大小因此跨作品恒定,远边贴近视线水平线;
 * 点数恒定 25k——角大小恒定时屏幕空间密度 = 点数/角面积,跨作品天然一致
 * (若按世界面积补点数反而会打破屏幕密度一致性);粒径沿用模型点规则
 * (模型间距 × 0.5),模型间距与视距同比例缩放,屏幕上相对密度同样一致。
 * 径向密度中心密远处疏(r = R × rand^0.75),每点 fades 径向衰减 (1-r/R)^1.2,
 * 远缘溶解进黑底,视觉"无限"但点集有限。圆盘以模型中心为圆心,
 * 几何随视距自相似缩放,视差转动(±30°)下左右下三边缘覆盖不变。
 */

const GROUND_RADIUS = 60;
const GROUND_POINT_COUNT = 25_000;
const GROUND_SEED = 0x5eed01;
/** 地面半径 / 取景视距:标定自 Tree Habitat(60 ÷ 12.588 ≈ 4.767)。 */
const GROUND_RADIUS_VIEW_FACTOR = 4.76;

/** mulberry32:与标定页/采样器同款的确定性 PRNG(ambient 点场也共用它,勿再复制)。 */
export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type GroundPointField = {
  pointCount: number;
  positions: Float32Array;
  /** 全部朝上 (0,1,0)。 */
  normals: Float32Array;
  rands: Float32Array;
  /** 径向亮度衰减 0..1(中心 1,边缘 0)。 */
  fades: Float32Array;
};

/** 生成以原点为圆心、位于 y = yLevel 的纯平粒子地面。 */
export function createGroundPointField(
  yLevel: number,
  pointCount: number = GROUND_POINT_COUNT,
  radius: number = GROUND_RADIUS,
  seed: number = GROUND_SEED,
): GroundPointField {
  const rand = mulberry32(seed);
  const positions = new Float32Array(pointCount * 3);
  const normals = new Float32Array(pointCount * 3);
  const rands = new Float32Array(pointCount);
  const fades = new Float32Array(pointCount);
  for (let i = 0; i < pointCount; i += 1) {
    const r = radius * Math.pow(rand(), 0.75);
    const theta = rand() * Math.PI * 2;
    positions[i * 3] = r * Math.cos(theta);
    positions[i * 3 + 1] = yLevel;
    positions[i * 3 + 2] = r * Math.sin(theta);
    normals[i * 3 + 1] = 1;
    rands[i] = rand();
    fades[i] = Math.pow(1 - r / radius, 1.2);
  }
  return { pointCount, positions, normals, rands, fades };
}

export const GROUND_DEFAULTS = {
  radius: GROUND_RADIUS,
  pointCount: GROUND_POINT_COUNT,
} as const;

/** 归一化地面半径:视距 × 4.76(Tree Habitat 标定值),小负数/零防护到 0。 */
export function groundRadiusForViewDistance(viewDistance: number): number {
  return Math.max(viewDistance, 0) * GROUND_RADIUS_VIEW_FACTOR;
}
