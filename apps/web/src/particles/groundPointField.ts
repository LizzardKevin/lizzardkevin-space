import { mulberry32 } from "./seededRandom.ts";

/** Shared screen-space calibration; world model dimensions never set floor density. */
export const GROUND_STYLE = { referenceHeight: 900, spacingPixels: 9, diameterPixels: 1.3, brightness: .32 } as const;

/** Stratified camera rays meet the actual model's floor plane. The same seed
 * gives the same projected positions, fades and scatter distribution per work.
 * Extra coverage outside the viewport accommodates camera parallax and wide screens.
 */
export function createGroundPointField(yLevel: number, viewDistance: number, viewOffset = 0) {
  const step = 2 * GROUND_STYLE.spacingPixels / GROUND_STYLE.referenceHeight;
  const columns = Math.round(6.4 / step), rows = Math.round(1.7 / step);
  const count = columns * rows;
  const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3);
  const rands = new Float32Array(count), fades = new Float32Array(count), alts = new Float32Array(count * 3);
  const random = mulberry32(0x5eed01), scatter = mulberry32(0x5eed04);
  const elevation = Math.atan(.15), s = Math.sin(elevation), c = Math.cos(elevation), tangent = Math.tan(Math.PI / 8);
  const cameraY = viewDistance * s, cameraZ = viewDistance * c;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const i = row * columns + column;
      // u is in viewport-height units (not aspect-dependent NDC x).
      const u = -3.2 + (column + .1 + random() * .8) * step;
      const v = .2 - (row + .1 + random() * .8) * step;
      const rayY = v * tangent * c - s;
      const depth = (yLevel - cameraY) / rayY;
      positions[i * 3] = -viewOffset + u * tangent * depth;
      positions[i * 3 + 1] = yLevel;
      positions[i * 3 + 2] = cameraZ + (-v * tangent * s - c) * depth;
      normals[i * 3 + 1] = 1;
      rands[i] = random();
      fades[i] = Math.min((.2 - v) / .35, 1);

      // A genuine volume, not alts=positions: all floor points leave the plane.
      // Depth scales with the camera; projection and density remain model-independent.
      const targetDepth = viewDistance * (.55 + scatter() * 1.25);
      const targetX = (scatter() * 2 - 1) * 3.2 * tangent * targetDepth;
      const targetY = (scatter() * 2 - 1) * 1.5 * tangent * targetDepth;
      alts[i * 3] = -viewOffset + targetX;
      alts[i * 3 + 1] = cameraY + targetY * c - targetDepth * s;
      alts[i * 3 + 2] = cameraZ - targetY * s - targetDepth * c;
    }
  }
  return { positions, normals, rands, fades, alts };
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
