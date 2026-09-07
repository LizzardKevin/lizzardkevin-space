/**
 * 入场揭示(intro reveal)的纯函数层:作品页点云按"离相机远→近"与"从下往上"
 * 双轴混合依次生成,生成瞬间着提示黄(#e8d44d),随后混回灰阶白。
 *
 * 这里只放与 shader 镜像的标量数学,供 Node 单测直接验证;
 * 着色器实现(TSL)在 particlePointsMaterial.ts,常量从本模块单向流入,勿复制数值。
 *
 * 时间轴:introProgress 0→1 扫过全场(默认 INTRO_DURATION_SEC≈2.2s,线性);
 * 单点在 INTRO_REVEAL_WINDOW 进度窗(0.2 × 2.2s ≈ 0.44s)内完成 隐藏→黄→白。
 * 排序键 = 深度项(远→近)与高度项(下→上)按 INTRO_HEIGHT_WEIGHT 等权混合:
 * 高瘦建筑的顶部不再因离相机远而在第一时间闪黄出现。
 */

/** 入场揭示总时长(秒)。 */
export const INTRO_DURATION_SEC = 2.2;
/** 单点从"开始生成"到"完全生成"占 introProgress 的窗口(0.2 × 2.2s ≈ 0.44s)。 */
export const INTRO_REVEAL_WINDOW = 0.2;
/** 排序键上的随机抖动占比:打散纯切片,出"波浪"而非"扫描面";小于单轴权重,不颠倒轴向顺序。 */
export const INTRO_RAND_JITTER = 0.15;
/** 高度项(下→上)在排序键中的权重;深度项(远→近)占 1 − INTRO_HEIGHT_WEIGHT。 */
export const INTRO_HEIGHT_WEIGHT = 0.5;

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1);

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/**
 * 单点 reveal 起始阈值 ∈ [0, 1 − INTRO_REVEAL_WINDOW]。
 * depthNorm 为视距深度归一化(0=最近,1=最远),heightNorm 为高度归一化
 * (0=页面 bounds 底,含地面;1=模型顶):远点/低点排序键小(先出),近点/高点大(后出);
 * rand(每点稳定随机数 0..1)按 INTRO_RAND_JITTER 占比掺入,打散切片。
 * 上限留出整个 reveal 窗口,保证 introProgress=1 时所有点完全生成。
 */
export function introRevealThreshold(depthNorm: number, heightNorm: number, rand: number): number {
  const order =
    (1 - clamp01(depthNorm)) * (1 - INTRO_HEIGHT_WEIGHT) +
    clamp01(heightNorm) * INTRO_HEIGHT_WEIGHT;
  return (
    (order * (1 - INTRO_RAND_JITTER) + clamp01(rand) * INTRO_RAND_JITTER) *
    (1 - INTRO_REVEAL_WINDOW)
  );
}

/** 单点 reveal 进度 0..1:0=未生成(不可见),1=完全生成(已回到灰阶白)。 */
export function introPointReveal(introProgress: number, threshold: number): number {
  return clamp01((introProgress - threshold) / INTRO_REVEAL_WINDOW);
}

/** 生成淡入透明度:reveal 前 40% 由 0→1(对应 shader opacity 系数)。 */
export function introAlpha(revealT: number): number {
  return smoothstep(0, 0.4, revealT);
}

/** 黄色权重:reveal 0.25→1 区间由 1→0(1=纯提示黄,0=灰阶白)。 */
export function introYellowWeight(revealT: number): number {
  return 1 - smoothstep(0.25, 1, revealT);
}
