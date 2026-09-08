import { mulberry32 } from "./seededRandom.ts";

export const GROUND_STYLE = {
  referenceHeight: 900, spacingPixels: 4, diameterPixels: 1.3, brightness: .32,
  falloffPixels: 90, extentX: 8, nearLimit: -4, horizon: .35, farClipFactor: 160,
} as const;

export function groundDensityAtDistance(distancePixels: number, modelDensity: number): number {
  const peak = Math.min(1 / GROUND_STYLE.spacingPixels ** 2, Math.max(modelDensity, 0));
  return peak / (1 + (Math.max(distancePixels, 0) / GROUND_STYLE.falloffPixels) ** 2);
}

type ProjectionBounds = { minX: number; maxX: number; minY: number; maxY: number };
export function modelProjectionBounds(positions: Float32Array, distance: number, offset: number): ProjectionBounds {
  const e = Math.atan(.15), c = Math.cos(e), s = Math.sin(e), focal = 450 / Math.tan(Math.PI / 8);
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (let i = 0; i < positions.length; i += 3) {
    const depth = Math.max(distance - positions[i + 1] * s - positions[i + 2] * c, distance * .01);
    const x = (positions[i] + offset) / depth * focal, y = (positions[i + 1] * c - positions[i + 2] * s) / depth * focal;
    bounds.minX = Math.min(bounds.minX, x); bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y); bounds.maxY = Math.max(bounds.maxY, y);
  }
  return bounds;
}

const smooth01 = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

/** Fixed seeded membership: density (not merely brightness) falls with projected
 * distance from the model envelope. Wide coverage and zero-alpha boundary fade
 * hide the finite field even at large parallax angles. */
export function createGroundPointField(yLevel: number, viewDistance: number, viewOffset = 0,
  options: { bounds?: ProjectionBounds; modelDensity?: number } = {}) {
  const bounds = options.bounds ?? { minX: -90, maxX: 90, minY: -150, maxY: 150 };
  const modelDensity = options.modelDensity ?? 1;
  const spacing = Math.max(GROUND_STYLE.spacingPixels, 1 / Math.sqrt(Math.max(modelDensity, 1e-6)));
  const step = 2 * spacing / GROUND_STYLE.referenceHeight;
  const columns = Math.round(GROUND_STYLE.extentX * 2 / step);
  const rows = Math.round((GROUND_STYLE.horizon - GROUND_STYLE.nearLimit) / step);
  const positions: number[] = [], normals: number[] = [], rands: number[] = [], fades: number[] = [], alts: number[] = [];
  const random = mulberry32(0x5eed01), scatter = mulberry32(0x5eed04);
  const elevation = Math.atan(.15), s = Math.sin(elevation), c = Math.cos(elevation), tangent = Math.tan(Math.PI / 8);
  const cameraY = viewDistance * s, cameraZ = viewDistance * c;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const u = -GROUND_STYLE.extentX + (column + .1 + random() * .8) * step;
      const v = GROUND_STYLE.horizon - (row + .1 + random() * .8) * step;
      const px = u * 450, py = v * 450;
      const distance = Math.hypot(Math.max(bounds.minX - px, 0, px - bounds.maxX), Math.max(bounds.minY - py, 0, py - bounds.maxY));
      const keep = groundDensityAtDistance(distance, modelDensity) * spacing ** 2;
      if (random() > keep) continue;
      const rayY = v * tangent * c - s, depth = (yLevel - cameraY) / rayY;
      positions.push(-viewOffset + u * tangent * depth, yLevel, cameraZ + (-v * tangent * s - c) * depth);
      normals.push(0, 1, 0); rands.push(random());
      fades.push(smooth01((GROUND_STYLE.horizon - v) / .35)
        * smooth01((GROUND_STYLE.extentX - Math.abs(u)) / 3.5)
        * smooth01((v - GROUND_STYLE.nearLimit) / 2));
      const targetDepth = viewDistance * (.55 + scatter() * 1.25);
      const targetX = (scatter() * 2 - 1) * 3.2 * tangent * targetDepth;
      const targetY = (scatter() * 2 - 1) * 1.5 * tangent * targetDepth;
      alts.push(-viewOffset + targetX, cameraY + targetY * c - targetDepth * s, cameraZ - targetY * s - targetDepth * c);
    }
  }
  return { positions: new Float32Array(positions), normals: new Float32Array(normals),
    rands: new Float32Array(rands), fades: new Float32Array(fades), alts: new Float32Array(alts) };
}

export type GroundPointField = ReturnType<typeof createGroundPointField>;

/** Reproject the fixed membership when the viewport changes its framing distance. */
export function groundFrameTransform(yLevel: number, fromDistance: number, toDistance: number, offset: number) {
  const elevation = Math.atan(.15), s = Math.sin(elevation), c = Math.cos(elevation);
  const scale = (toDistance * s - yLevel) / (fromDistance * s - yLevel);
  const scatterScale = toDistance / fromDistance;
  return {
    scale,
    shift: [-offset * (1 - scale), yLevel * (1 - scale), c * (toDistance - fromDistance * scale)] as const,
    scatterScale,
    scatterShift: [-offset * (1 - scatterScale), 0, 0] as const,
  };
}
