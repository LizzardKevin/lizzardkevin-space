/**
 * 展台自转速度（弧度/秒）。与原先 OrbitControls autoRotateSpeed=0.8 的观感对齐：
 * three.js 每帧增量为 (2π/60/60)*speed @60fps → 每秒 (π/30)*speed。
 */
export const FOCUS_AUTO_ROTATE_SPEED = 0.8;

export const FOCUS_TURNTABLE_RAD_PER_SEC = (Math.PI / 30) * FOCUS_AUTO_ROTATE_SPEED;

/** 两次点击间隔 ≤ 此值（ms）才触发 Focus 双击退出。 */
export const FOCUS_DOUBLE_CLICK_MS = 200;

/** 临时：淡蓝标出 Focus 可双击退出的空白区域。验证完成后改为 false。 */
export const SHOW_FOCUS_BLANK_DEBUG = false;
