import type { SpaceExplorationTaskId } from "./spaceQuestSelection.ts";

/**
 * 探索提示的隐藏完成条件(传感器)。每个传感器是带内部状态的小纯函数:
 * 接收事件流(附时间戳),返回 true 表示该任务刚完成。完成判定幂等由 store 保证
 * (完成后传感器不再被调用)。
 *
 * 条件绝不显示在 UI 上;这里是一切"怎么算完成"的唯一权威。
 */

export type SpaceExplorationEvent =
  | { type: "pose-sampled"; position: [number, number, number]; yawRad: number; pitchRad: number }
  | { type: "jump-unlocked" }
  | { type: "work-targeted"; exhibitId: string | null }
  | { type: "work-opened"; exhibitId: string }
  | { type: "work-model-dragged"; exhibitId: string; rotationDeltaDeg: number }
  | { type: "projector-slide-changed"; slideId: string }
  | { type: "closed-zone-hint-shown"; zoneId: string }
  | { type: "stillness-reset" };

export type SpaceQuestSensor = (event: SpaceExplorationEvent, nowMs: number) => boolean;

/** the_long_way:正常水平位移累计 500m。单样本位移超过阈值视为出生/传送/恢复,不计。 */
export const LONG_WAY_TARGET_M = 500;
export const LONG_WAY_MAX_SAMPLE_STEP_M = 1.5;

/** 仰/俯视:连续超过 80°,持续 5 秒;低于阈值立即重置。 */
export const GAZE_PITCH_THRESHOLD_RAD = (80 * Math.PI) / 180;
export const GAZE_HOLD_MS = 5000;
/** 传感器以 ≤10Hz 采样;样本间隔超过该值按钳制处理(掉帧/切后台不一次性累计)。 */
export const SENSOR_MAX_SAMPLE_GAP_MS = 250;

/** 静止:位置/yaw/pitch 全部不动持续 60s。 */
export const STILLNESS_HOLD_MS = 60_000;
export const STILLNESS_POSITION_EPSILON_M = 0.01;
export const STILLNESS_ANGLE_EPSILON_RAD = 0.002;

/** 注视:同一展品目标持续 30s;允许不超过 250ms 的目标丢失抖动。 */
export const WORK_GAZE_HOLD_MS = 30_000;
export const WORK_GAZE_LOSS_GRACE_MS = 250;

/** three_encounters:按唯一 exhibitId 计数。 */
export const ENCOUNTERS_TARGET = 3;

function createLongWaySensor(): SpaceQuestSensor {
  let last: [number, number] | null = null;
  let distance = 0;
  return (event) => {
    if (event.type !== "pose-sampled") return false;
    const [x, , z] = event.position;
    if (last) {
      const step = Math.hypot(x - last[0], z - last[1]);
      if (step <= LONG_WAY_MAX_SAMPLE_STEP_M) distance += step;
    }
    last = [x, z];
    return distance >= LONG_WAY_TARGET_M;
  };
}

function createGazeSensor(direction: "up" | "down"): SpaceQuestSensor {
  let accumulated = 0;
  let lastMs: number | null = null;
  return (event, nowMs) => {
    if (event.type !== "pose-sampled") return false;
    const beyond =
      direction === "up"
        ? event.pitchRad >= GAZE_PITCH_THRESHOLD_RAD
        : event.pitchRad <= -GAZE_PITCH_THRESHOLD_RAD;
    if (!beyond) {
      accumulated = 0; // 低于 80° 立即重置
    } else if (lastMs !== null) {
      accumulated += Math.min(Math.max(nowMs - lastMs, 0), SENSOR_MAX_SAMPLE_GAP_MS);
    }
    lastMs = nowMs;
    return accumulated >= GAZE_HOLD_MS;
  };
}

function createStillnessSensor(): SpaceQuestSensor {
  let lastPose: { position: [number, number, number]; yawRad: number; pitchRad: number } | null = null;
  let stillSince: number | null = null;
  return (event, nowMs) => {
    if (event.type === "stillness-reset") {
      // lastPose 也必须清掉:否则下一帧未移动时走“未移动”分支,stillSince 永远为 null,
      // 计时永不重启(ESC/失焦后原地站再久也无法完成)。
      lastPose = null;
      stillSince = null;
      return false;
    }
    if (event.type !== "pose-sampled") return false;
    const { position, yawRad, pitchRad } = event;
    if (!lastPose) {
      lastPose = { position: [...position], yawRad, pitchRad };
      stillSince = nowMs;
      return false;
    }
    const moved =
      Math.hypot(
        position[0] - lastPose.position[0],
        position[1] - lastPose.position[1],
        position[2] - lastPose.position[2],
      ) > STILLNESS_POSITION_EPSILON_M ||
      Math.abs(yawRad - lastPose.yawRad) > STILLNESS_ANGLE_EPSILON_RAD ||
      Math.abs(pitchRad - lastPose.pitchRad) > STILLNESS_ANGLE_EPSILON_RAD;
    if (moved) {
      lastPose = { position: [...position], yawRad, pitchRad };
      stillSince = nowMs;
      return false;
    }
    return stillSince !== null && nowMs - stillSince >= STILLNESS_HOLD_MS;
  };
}

function createEncountersSensor(): SpaceQuestSensor {
  const seen = new Set<string>();
  return (event) => {
    if (event.type !== "work-opened" || !event.exhibitId) return false;
    seen.add(event.exhibitId);
    return seen.size >= ENCOUNTERS_TARGET;
  };
}

function createWorkGazeSensor(): SpaceQuestSensor {
  let targetId: string | null = null;
  let gazeSince: number | null = null;
  let lostAtMs: number | null = null;
  return (event, nowMs) => {
    if (event.type === "work-opened") {
      // 打开作品即离开注视场景,重置
      targetId = null;
      gazeSince = null;
      lostAtMs = null;
      return false;
    }
    if (event.type !== "work-targeted") return false;
    if (event.exhibitId && event.exhibitId === targetId) {
      // 同目标归来:必须先在此时判定宽限——丢失期间没有后续事件,
      // 宽限过期只能在“归来”这一刻结算;超过宽限则重开计时。
      if (lostAtMs !== null) {
        if (nowMs - lostAtMs > WORK_GAZE_LOSS_GRACE_MS) {
          gazeSince = nowMs;
        }
        lostAtMs = null;
      }
      return gazeSince !== null && nowMs - gazeSince >= WORK_GAZE_HOLD_MS;
    }
    if (event.exhibitId && event.exhibitId !== targetId) {
      // 换了目标:若之前只是短暂丢失(≤250ms)且回来了,已在上面分支处理;
      // 这里是真正的新目标,重新计时
      targetId = event.exhibitId;
      gazeSince = nowMs;
      lostAtMs = null;
      return false;
    }
    // 目标丢失:进入宽限期
    if (targetId !== null && lostAtMs === null) lostAtMs = nowMs;
    if (targetId !== null && lostAtMs !== null && nowMs - lostAtMs > WORK_GAZE_LOSS_GRACE_MS) {
      targetId = null;
      gazeSince = null;
      lostAtMs = null;
    }
    return false;
  };
}

function createProjectorSlideSensor(): SpaceQuestSensor {
  let lastSlideId: string | null = null;
  return (event) => {
    // 只认画面真正切换后的事件;Q/E 按键本身不产生该事件
    if (event.type !== "projector-slide-changed") return false;
    const changed = lastSlideId !== null && event.slideId !== lastSlideId;
    lastSlideId = event.slideId;
    return changed;
  };
}

function createOnceOnEventSensor(type: SpaceExplorationEvent["type"]): SpaceQuestSensor {
  return (event) => event.type === type;
}

export function createSpaceQuestSensor(taskId: SpaceExplorationTaskId): SpaceQuestSensor {
  switch (taskId) {
    case "leave_the_floor":
      return createOnceOnEventSensor("jump-unlocked");
    case "the_long_way":
      return createLongWaySensor();
    case "whats_above":
      return createGazeSensor("up");
    case "whats_below":
      return createGazeSensor("down");
    case "let_the_room_settle":
      return createStillnessSensor();
    case "three_encounters":
      return createEncountersSensor();
    case "dont_look_away":
      return createWorkGazeSensor();
    case "another_angle":
      // 事件源已按"有效拖拽"(>5° 或 >12px)过滤,单击不会产生该事件
      return createOnceOnEventSensor("work-model-dragged");
    case "next_scene":
      return createProjectorSlideSensor();
    case "beyond_the_barrier":
      return createOnceOnEventSensor("closed-zone-hint-shown");
  }
}

/**
 * 下坡走廊触发范围(2026-08-06 实测):
 * 出生走廊为 MAP_FLOOR_016(z -52.3..-21.8, 板顶 y≈36.0);其尽头接
 * MAP_STAIR_063 大坡道(x -1.6..0.4, z -21.8..-11.0, y 36.0 降至 28.8)。
 * 触发盒 = 坡道 2D 包围盒外扩 0.3m;y 用胶囊中心(pose.y)限制在坡道附近。
 */
export const SPACE_DOWNHILL_CORRIDOR = {
  minX: -1.9,
  maxX: 0.7,
  minZ: -22.1,
  maxZ: -10.7,
  minY: 28.5,
  maxY: 37.2,
} as const;

export function isInDownhillCorridor(position: readonly [number, number, number]) {
  const [x, y, z] = position;
  return (
    x >= SPACE_DOWNHILL_CORRIDOR.minX &&
    x <= SPACE_DOWNHILL_CORRIDOR.maxX &&
    z >= SPACE_DOWNHILL_CORRIDOR.minZ &&
    z <= SPACE_DOWNHILL_CORRIDOR.maxZ &&
    y >= SPACE_DOWNHILL_CORRIDOR.minY &&
    y <= SPACE_DOWNHILL_CORRIDOR.maxY
  );
}

/**
 * 已在走廊之后(z 越过坡道远端):刷新后 daily resume 把玩家放在展厅深处时,
 * 探索提示应直接激活,不要求走回走廊。
 */
export function isPastDownhillCorridor(position: readonly [number, number, number]) {
  return position[2] > SPACE_DOWNHILL_CORRIDOR.maxZ;
}
