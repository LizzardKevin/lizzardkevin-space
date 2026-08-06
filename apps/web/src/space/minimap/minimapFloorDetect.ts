import type { SpaceMinimapFloorPiece } from "./minimapModel";

/**
 * 全息地图的站立检测:纯空间判定,不依赖碰撞/事件链。
 * 玩家脚底位置 = pose.y + FEET_OFFSET;在逐块步行面的 2D 包围盒内找命中:
 * 楼梯段按竖直跨度包含判定(斜坡上脚介于顶底之间),楼板取顶面不超过脚底
 * 容差的最高一块(多层楼层天然分层)。楼梯命中优先于楼板。
 */

/** pose.position 是胶囊中心;脚底 = 中心 − (半高 0.65 + 半径 0.25)。 */
export const SPACE_MINIMAP_FEET_OFFSET = -0.9;

/** 楼板顶面允许高出脚底的最大值(台阶沿/小高差仍算站在该板上)。 */
export const SPACE_MINIMAP_FLOOR_TOP_TOLERANCE = 0.35;

/** 楼梯竖直跨度的上下放宽:从踏步底到略高于梯顶都视为在梯段上。 */
export const SPACE_MINIMAP_STAIR_SPAN_BELOW = 0.5;
export const SPACE_MINIMAP_STAIR_SPAN_ABOVE = 0.2;

/** 2D 包围盒的边界外扩,贴着边缘站也算命中。 */
const XZ_EXPAND = 0.05;

function containsXZ(piece: SpaceMinimapFloorPiece, x: number, z: number) {
  const { min, max } = piece.bounds;
  return (
    x >= min.x - XZ_EXPAND && x <= max.x + XZ_EXPAND && z >= min.z - XZ_EXPAND && z <= max.z + XZ_EXPAND
  );
}

export function resolveSpaceMinimapFloorAt(
  pieces: readonly SpaceMinimapFloorPiece[],
  position: readonly [number, number, number],
): string | null {
  const [x, y, z] = position;
  const feetY = y + SPACE_MINIMAP_FEET_OFFSET;

  let stairHit: SpaceMinimapFloorPiece | null = null;
  let floorHit: SpaceMinimapFloorPiece | null = null;
  let floorTop = -Infinity;

  for (const piece of pieces) {
    if (!containsXZ(piece, x, z)) continue;
    if (piece.kind === "stair") {
      const { min, max } = piece.bounds;
      if (
        feetY >= min.y - SPACE_MINIMAP_STAIR_SPAN_BELOW &&
        feetY <= max.y + SPACE_MINIMAP_STAIR_SPAN_ABOVE
      ) {
        // 多个梯段重叠时取竖直跨度更窄的(更贴近当前站位)。
        if (!stairHit || max.y - min.y < stairHit.bounds.max.y - stairHit.bounds.min.y) {
          stairHit = piece;
        }
      }
      continue;
    }
    const top = piece.bounds.max.y;
    if (top <= feetY + SPACE_MINIMAP_FLOOR_TOP_TOLERANCE && top > floorTop) {
      floorHit = piece;
      floorTop = top;
    }
  }

  return stairHit?.name ?? floorHit?.name ?? null;
}
