export const START_LOBBY_INTRO_WIPE_MS = 950;
export const START_LOBBY_INTRO_ASSEMBLE_OFFSET_MS = 120;
export const START_LOBBY_INTRO_FRAGMENT_DELAY_MS = 240;
export const START_LOBBY_INTRO_FRAGMENT_MIN_MS = 860;
export const START_LOBBY_INTRO_FRAGMENT_VARIANCE_MS = 340;
export const START_LOBBY_INTRO_SETTLE_HOLD_MS = 240;
/** "SPACE" 整词比 "LIZZARDKEVIN" 晚起的基准延迟。 */
export const START_LOBBY_INTRO_SPACE_DELAY_MS = 120;
/** "SPACE" 各字母从左到右的级联错相。 */
export const START_LOBBY_INTRO_LETTER_STAGGER_MS = 30;
export const START_LOBBY_INTRO_WORD_STAGGER_MS =
  START_LOBBY_INTRO_SPACE_DELAY_MS + 4 * START_LOBBY_INTRO_LETTER_STAGGER_MS;

export const START_LOBBY_INTRO_ASSEMBLE_MS =
  START_LOBBY_INTRO_ASSEMBLE_OFFSET_MS +
  START_LOBBY_INTRO_WORD_STAGGER_MS +
  START_LOBBY_INTRO_FRAGMENT_DELAY_MS +
  START_LOBBY_INTRO_FRAGMENT_MIN_MS +
  START_LOBBY_INTRO_FRAGMENT_VARIANCE_MS;

export const START_LOBBY_INTRO_TOTAL_MS = START_LOBBY_INTRO_ASSEMBLE_MS;

/** 聚合完成后的 shatter 时钟秒数:intro 不播放(reduced-motion)或跳过时直接落在终态。 */
export const START_LOBBY_INTRO_ASSEMBLED_CLOCK_S = START_LOBBY_INTRO_TOTAL_MS / 1000;

export const START_LOBBY_SHATTER_OVERSHOOT = 1.2;
export const START_LOBBY_SHATTER_START_SCALE = 0.45;
export const START_LOBBY_SHATTER_ALPHA_RAMP = 0.3;
/** 每个碎片簇包含的相邻三角形数:14 个连续面合成一个大碎片,碎片总数≈200(约逐面爆炸的 1/14)。 */
export const START_LOBBY_SHATTER_FACES_PER_SHARD = 14;

const SHATTER_SCATTER_MIN_RATIO = 0.55;
const SHATTER_SCATTER_VARIANCE = 0.9;
const SHATTER_SCATTER_DEPTH_RATIO = 0.32;
const SHATTER_ANGLE_JITTER_RAD = 1.1;
const SHATTER_MAX_SPIN_RAD = Math.PI * 1.1;

export type LobbyShatterClock = { value: number };

export type LobbyShatterFaceCenter = Readonly<{
  x: number;
  y: number;
  z: number;
}>;

/** 碎片簇:每 facesPerShard 个按面序相邻的三角形共享同一簇心,作为一个大碎片整体运动。 */
export type LobbyShatterShard = Readonly<{
  /** 簇心(簇内各面心的均值,碎片的旋转/缩放支点) */
  center: LobbyShatterFaceCenter;
  /** 簇内三角形面数(末尾簇可能不足 facesPerShard) */
  faceCount: number;
}>;

export type LobbyShatterFaceSpec = Readonly<{
  /** 完全炸开(progress 1)时面心相对原位的位移(场景单位) */
  scatterX: number;
  scatterY: number;
  scatterZ: number;
  /** 碎片自旋轴(单位向量) */
  axisX: number;
  axisY: number;
  axisZ: number;
  /** 完全炸开时的自旋角(弧度,带符号) */
  spin: number;
  /** 聚合开始时刻(ms,已含 assemble offset 与词级错相) */
  delayMs: number;
  /** 聚合时长(ms) */
  durationMs: number;
}>;

export type LobbyShatterFacePose = Readonly<{
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  angle: number;
  scale: number;
  alpha: number;
  progress: number;
  settled: boolean;
}>;

export type CreateLobbyShatterFacesOptions = Readonly<{
  seed?: number;
  wordDelayMs?: number;
}>;

/** 全屏白场渐隐:整屏由纯白均匀淡出,不做任何方向性扫掠。 */
export type LobbyIntroWipeState = Readonly<{
  /** 白场不透明度 1→0 */
  opacity: number;
  active: boolean;
}>;

function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}

function seededUnit(seed: number) {
  const value = Math.sin(seed * 91.713) * 43_758.5453;
  return value - Math.floor(value);
}

/** 与注入 shader 的 GLSL lobbyShatterEase 严格一致的 ease(带回冲,端点精确落地)。 */
export function resolveLobbyShatterEase(progress: number) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  const t = clampUnit(progress) - 1;
  return 1 + (START_LOBBY_SHATTER_OVERSHOOT + 1) * t * t * t + START_LOBBY_SHATTER_OVERSHOOT * t * t;
}

/**
 * 按面序把连续 facesPerShard 个三角形并成一个碎片簇,簇心取簇内面心均值。
 * TextGeometry 的三角形顺序在字形内基本空间相邻,因此簇大致是一块更大的连续碎片;
 * 簇内所有面共享同一簇心与同一随机 spec,作为刚体整体运动。
 */
export function clusterLobbyShatterFaces(
  centers: readonly LobbyShatterFaceCenter[],
  facesPerShard: number = START_LOBBY_SHATTER_FACES_PER_SHARD,
): LobbyShatterShard[] {
  if (centers.length === 0) return [];
  const shardSize = Math.max(1, Math.floor(facesPerShard));
  const shards: LobbyShatterShard[] = [];
  for (let start = 0; start < centers.length; start += shardSize) {
    const end = Math.min(start + shardSize, centers.length);
    let x = 0;
    let y = 0;
    let z = 0;
    for (let face = start; face < end; face += 1) {
      x += centers[face].x;
      y += centers[face].y;
      z += centers[face].z;
    }
    const faceCount = end - start;
    shards.push({
      center: { x: x / faceCount, y: y / faceCount, z: z / faceCount },
      faceCount,
    });
  }
  return shards;
}

export function createLobbyShatterFaces(
  centers: readonly LobbyShatterFaceCenter[],
  options: CreateLobbyShatterFacesOptions = {},
): LobbyShatterFaceSpec[] {
  if (centers.length === 0) return [];  const seedBase = options.seed ?? 1;
  const wordDelayMs = options.wordDelayMs ?? 0;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const center of centers) {
    minX = Math.min(minX, center.x);
    maxX = Math.max(maxX, center.x);
    minY = Math.min(minY, center.y);
    maxY = Math.max(maxY, center.y);
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const maxDim = Math.max(maxX - minX, maxY - minY, 0.001);

  return centers.map((center, index) => {
    const seed = seedBase * 1009 + index * 7.13;
    // 从四周聚拢:散射方向偏向"几何中心→面心"的外向射线,再加锥形抖动与前后景深。
    const outwardX = center.x - centerX;
    const outwardY = center.y - centerY;
    const outwardAngle =
      Math.hypot(outwardX, outwardY) < maxDim * 0.001
        ? seededUnit(seed + 3) * Math.PI * 2
        : Math.atan2(outwardY, outwardX);
    const angle = outwardAngle + (seededUnit(seed) - 0.5) * 2 * SHATTER_ANGLE_JITTER_RAD;
    const distance =
      maxDim * (SHATTER_SCATTER_MIN_RATIO + SHATTER_SCATTER_VARIANCE * seededUnit(seed + 11));

    // 自旋轴:球面均匀采样,保证单位长度。
    const axisZ = seededUnit(seed + 41) * 2 - 1;
    const axisTheta = seededUnit(seed + 43) * Math.PI * 2;
    const axisRadius = Math.sqrt(Math.max(0, 1 - axisZ * axisZ));

    return {
      scatterX: Math.cos(angle) * distance,
      scatterY: Math.sin(angle) * distance,
      scatterZ: (seededUnit(seed + 17) * 2 - 1) * maxDim * SHATTER_SCATTER_DEPTH_RATIO,
      axisX: axisRadius * Math.cos(axisTheta),
      axisY: axisRadius * Math.sin(axisTheta),
      axisZ,
      spin: (seededUnit(seed + 89) - 0.5) * 2 * SHATTER_MAX_SPIN_RAD,
      delayMs:
        START_LOBBY_INTRO_ASSEMBLE_OFFSET_MS +
        wordDelayMs +
        seededUnit(seed + 37) * START_LOBBY_INTRO_FRAGMENT_DELAY_MS,
      durationMs:
        START_LOBBY_INTRO_FRAGMENT_MIN_MS +
        seededUnit(seed + 53) * START_LOBBY_INTRO_FRAGMENT_VARIANCE_MS,
    };
  });
}

/** 与 shader 顶点数学完全一致的 CPU 侧镜像,用于测试端点/中间态。 */
export function sampleLobbyShatterFace(
  spec: LobbyShatterFaceSpec,
  elapsedMs: number,
): LobbyShatterFacePose {
  const progress = clampUnit((elapsedMs - spec.delayMs) / spec.durationMs);
  if (progress >= 1) {
    // 终态精确归零(GPU 侧 1-1=+0 同理),避免 -0 残差。
    return { offsetX: 0, offsetY: 0, offsetZ: 0, angle: 0, scale: 1, alpha: 1, progress: 1, settled: true };
  }
  const assembled = resolveLobbyShatterEase(progress);
  const amount = 1 - assembled;
  return {
    offsetX: spec.scatterX * amount,
    offsetY: spec.scatterY * amount,
    offsetZ: spec.scatterZ * amount,
    angle: spec.spin * amount,
    scale:
      START_LOBBY_SHATTER_START_SCALE +
      (1 - START_LOBBY_SHATTER_START_SCALE) * assembled,
    alpha: clampUnit(progress / START_LOBBY_SHATTER_ALPHA_RAMP),
    progress,
    settled: progress >= 1,
  };
}

export function resolveLobbyIntroWipe(elapsedMs: number): LobbyIntroWipeState {
  const progress = clampUnit(elapsedMs / START_LOBBY_INTRO_WIPE_MS);
  const eased =
    progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  return {
    opacity: 1 - eased,
    active: progress < 1,
  };
}
