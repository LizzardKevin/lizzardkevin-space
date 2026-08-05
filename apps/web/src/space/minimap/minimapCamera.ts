import * as THREE from "three";

/**
 * SPACE 全息小地图的正交相机数学。
 * 纯函数,无渲染器依赖,node --test 可直接覆盖。
 *
 * 视角约定(旷野之息守护者体内地图的 heading-up 行为):
 * 玩家朝向在屏幕上始终指向上方,地图模型随玩家 yaw 反向旋转。
 * 推导:玩家前向 = R_y(yaw)·(0,0,-1) = (-sin yaw, 0, -cos yaw);
 * 相机位于方位角 θ 时,屏幕上方向 ≈ 水平指向中心 = -(sin θ, 0, cos θ)。
 * 令两者相等得 θ = yaw,即相机方位角直接取玩家 yaw。
 */
export function spaceMinimapAzimuthForYaw(yawRad: number) {
  return yawRad;
}

/** 相机仰角:~35°,兼顾体量轮廓与楼层内部可读性。 */
export const SPACE_MINIMAP_ELEVATION_RAD = 0.62;

/** 包围球半径外的取景留白。 */
export const SPACE_MINIMAP_VIEW_MARGIN = 1.1;

/** 方位角阻尼(指数平滑,1/s);reduced-motion 下直接吸附不走阻尼。 */
export const SPACE_MINIMAP_AZIMUTH_LAMBDA = 8;

/** 相机距离 = 半径 × 该系数(正交相机,距离只影响 near/far 编排,不影响大小)。 */
const CAMERA_DISTANCE_FACTOR = 3;

const TWO_PI = Math.PI * 2;

/** 角插值:取最短路径(环绕 ±π 处不倒退),指数趋近目标。 */
export function dampSpaceMinimapAngleRad(
  currentRad: number,
  targetRad: number,
  lambda: number,
  deltaSec: number,
) {
  let delta = (targetRad - currentRad) % TWO_PI;
  if (delta > Math.PI) delta -= TWO_PI;
  if (delta < -Math.PI) delta += TWO_PI;
  const blend = 1 - Math.exp(-lambda * Math.max(deltaSec, 0));
  return currentRad + delta * blend;
}

/** 按包围球 + 视口宽高比布置正交相机(位置、视锥、up、lookAt)。 */
export function fitSpaceMinimapCamera(
  camera: THREE.OrthographicCamera,
  center: THREE.Vector3,
  radius: number,
  azimuthRad: number,
  aspect: number,
) {
  const safeRadius = Math.max(radius, 0.001);
  const safeAspect = Math.max(aspect, 0.001);
  const halfHeight = safeRadius * SPACE_MINIMAP_VIEW_MARGIN;
  const halfWidth = halfHeight * safeAspect;
  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;

  const distance = safeRadius * CAMERA_DISTANCE_FACTOR;
  camera.near = 0.1;
  camera.far = distance + safeRadius * 4;

  const cosElevation = Math.cos(SPACE_MINIMAP_ELEVATION_RAD);
  camera.position.set(
    center.x + Math.sin(azimuthRad) * cosElevation * distance,
    center.y + Math.sin(SPACE_MINIMAP_ELEVATION_RAD) * distance,
    center.z + Math.cos(azimuthRad) * cosElevation * distance,
  );
  camera.up.set(0, 1, 0);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}
