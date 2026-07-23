/** 点阵箭头（切换条 hover 时的三角形局部形态）状态总线：
 *  方向/强调色/强度目标值模块级共享；强度在 canvas 内非线性趋近。 */
export type DotGridArrowDirection = "left" | "right";

let arrowDirection: DotGridArrowDirection = "right";
let arrowTargetStrength = 0;
let arrowAccentColor: string | null = null;
const arrowListeners = new Set<() => void>();

export function readDotGridArrow() {
  return {
    direction: arrowDirection,
    targetStrength: arrowTargetStrength,
    accentColor: arrowAccentColor,
  };
}

/** 强度目标的写入口（订阅通知 canvas 重绘）。accentColor 为对方页面强调色。 */
export function setDotGridArrow(
  direction: DotGridArrowDirection | null,
  accentColor?: string,
) {
  const nextStrength = direction === null ? 0 : 1;
  if (direction !== null) arrowDirection = direction;
  arrowAccentColor = direction === null ? null : (accentColor ?? null);
  if (nextStrength === arrowTargetStrength) return;
  arrowTargetStrength = nextStrength;
  arrowListeners.forEach((listener) => listener());
}

export function subscribeDotGridArrow(listener: () => void) {
  arrowListeners.add(listener);
  return () => {
    arrowListeners.delete(listener);
  };
}
