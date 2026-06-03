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

/** Focus 展品按包围盒自动适配屏幕（见 focusModelFrame.ts） */
export const FOCUS_FRAME = {
  /** 归一化后目标包围球直径（世界单位） */
  targetDiameter: 2.15,
  minScale: 0.025,
  maxScale: 18,
  cameraFov: 45,
  /** 相对包围球的取景留白（>1 更远、更小） */
  framePadding: 1.2,
  /** 中间清晰区约占屏宽比例，用于水平方向取景 */
  centerWidthFraction: 0.46,
  orbitTargetY: -0.6,
  /** 相机相对 orbit 目标的高度抬升 */
  cameraHeightOffset: 1.8,
  minCameraDistance: 2.4,
  minZoomFactor: 0.5,
  maxZoomFactor: 3,
  /** 底部为 Focus 音频进度条预留高度（与 global.css --focus-bottom-safe 一致） */
  bottomPlaybackSafePx: 96,
  /** 顶部为展品标题预留（与 global.css --focus-top-safe 一致） */
  topTitleSafePx: 36,
  /** 进度条顶边距视口底（bottom 48 + 时间行/轨道高度，与 playback-bar 一致） */
  playbackBarTopPx: 75,
};
