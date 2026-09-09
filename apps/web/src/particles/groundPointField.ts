import { mulberry32 } from "./seededRandom.ts";

export const GROUND_STYLE = {
  referenceHeight: 900, spacingPixels: 4, diameterPixels: 1.3, brightness: .32,
  radiusFactor: 3, extentX: 8, nearLimit: -4, horizon: .35, farClipFactor: 160,
} as const;

export function groundDensityAtDistance(distance: number, modelDensity: number, radius = 900): number {
  const peak = Math.min(1 / GROUND_STYLE.spacingPixels ** 2, Math.max(modelDensity, 0));
  const t = Math.min(1, Math.max(distance, 0) / Math.max(radius, 1e-6));
  return peak * Math.exp(-3 * t * t) * (1 - t * t) ** 3;
}

const smooth01 = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };

/** Screen-stratified candidates keep the same visual density across works, but
 * membership falls radially in the actual XZ ground plane around model (0,0).
 * The compact cubic profile reaches zero with zero slope at the circular rim. */
export function createGroundPointField(yLevel: number, viewDistance: number, viewOffset = 0,
  options: { radius?: number; modelDensity?: number } = {}) {
  const radius = options.radius ?? viewDistance * 2;
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
      const rayY = v * tangent * c - s, depth = (yLevel - cameraY) / rayY;
      const x = -viewOffset + u * tangent * depth, z = cameraZ + (-v * tangent * s - c) * depth;
      const radialDistance = Math.hypot(x, z);
      const keep = groundDensityAtDistance(radialDistance, modelDensity, radius) * spacing ** 2;
      if (random() >= keep) continue;
      positions.push(x, yLevel, z);
      normals.push(0, 1, 0); rands.push(random());
      fades.push(smooth01((1 - radialDistance / radius) / .3)
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

/** Keep the assembled disk anchored to the model on resize; only scattered
 * targets reframe with the viewport. Moving the ground would move its center. */
export function groundFrameTransform(_yLevel: number, fromDistance: number, toDistance: number, offset: number) {
  const scatterScale = toDistance / fromDistance;
  return {
    scale: 1,
    shift: [0, 0, 0] as const,
    scatterScale,
    scatterShift: [-offset * (1 - scatterScale), 0, 0] as const,
  };
}
