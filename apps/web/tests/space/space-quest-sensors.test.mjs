import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

const {
  createSpaceQuestSensor,
  LONG_WAY_TARGET_M,
  LONG_WAY_MAX_SAMPLE_STEP_M,
  GAZE_PITCH_THRESHOLD_RAD,
  GAZE_HOLD_MS,
  STILLNESS_HOLD_MS,
  WORK_GAZE_HOLD_MS,
  WORK_GAZE_LOSS_GRACE_MS,
} = await importSourceModule("space/quests/spaceQuestSensors.ts");

const pose = (x, z, pitchRad = 0, yawRad = 0) => ({
  type: "pose-sampled",
  position: [x, 36, z],
  yawRad,
  pitchRad,
});
const UP = GAZE_PITCH_THRESHOLD_RAD + 0.05;
const DOWN = -GAZE_PITCH_THRESHOLD_RAD - 0.05;

test("the_long_way: 只累计正常水平位移,完成于 500m", () => {
  const sensor = createSpaceQuestSensor("the_long_way");
  let now = 0;
  let done = false;
  for (let i = 1; i * 0.5 < LONG_WAY_TARGET_M + 1 && !done; i++) {
    now += 100;
    done = sensor(pose(i * 0.5, 0), now);
  }
  assert.ok(done, "0.5m 步长累计到 500m 应完成");
});

test("the_long_way: 单样本大位移(出生/传送/恢复)不计入", () => {
  const sensor = createSpaceQuestSensor("the_long_way");
  let now = 0;
  sensor(pose(0, 0), (now += 100));
  // 一次 600m 的瞬移(超过阈值)不得直接完成
  assert.equal(sensor(pose(600, 0), (now += 100)), false);
  // 大位移后基准点更新,后续正常小步走仍从头累计
  let done = false;
  for (let i = 1; i * 0.5 < LONG_WAY_TARGET_M + 1 && !done; i++) {
    done = sensor(pose(600 + i * 0.5, 0), (now += 100));
  }
  assert.ok(done, "大位移之后从新的基准点正常累计");
  assert.ok(LONG_WAY_MAX_SAMPLE_STEP_M < 5, "阈值必须显著小于瞬移幅度");
});

test("whats_above: 连续仰视超 80° 满 5 秒才完成,低于阈值立即重置", () => {
  const sensor = createSpaceQuestSensor("whats_above");
  let now = 1_000;
  sensor(pose(0, 0, UP), now);
  // 4 秒仍不足
  for (let i = 0; i < 40; i++) assert.equal(sensor(pose(0, 0, UP), (now += 100)), false);
  // 掉下 80° → 立即重置
  sensor(pose(0, 0, 0.2), (now += 100));
  // 重新累计:4.9s 仍 false
  for (let i = 0; i < 49; i++) assert.equal(sensor(pose(0, 0, UP), (now += 100)), false);
  // 满 5s 完成
  assert.equal(sensor(pose(0, 0, UP), (now += 100)), true, "重置后累计满 5 秒才完成");
});

test("whats_below: 连续俯视超 80° 满 5 秒完成", () => {
  const sensor = createSpaceQuestSensor("whats_below");
  let now = 0;
  sensor(pose(0, 0, DOWN), now);
  let done = false;
  for (let i = 0; i < Math.ceil(GAZE_HOLD_MS / 100) + 2 && !done; i++) {
    done = sensor(pose(0, 0, DOWN), (now += 100));
  }
  assert.ok(done);
});

test("仰视传感器:掉帧大间隔按上限截断", () => {
  const sensor = createSpaceQuestSensor("whats_above");
  sensor(pose(0, 0, UP), 1_000);
  sensor(pose(0, 0, UP), 61_000); // 60s 大间隔最多计 250ms
  assert.equal(sensor(pose(0, 0, UP), 61_100), false, "不能把掉帧间隔一次计入");
});

test("let_the_room_settle: 静止 60 秒完成;移动/转头/外部重置均清零", () => {
  // 完成路径
  let sensor = createSpaceQuestSensor("let_the_room_settle");
  let now = 1_000;
  sensor(pose(0, 0), now);
  let done = false;
  for (let i = 0; i < Math.ceil(STILLNESS_HOLD_MS / 100) + 2 && !done; i++) {
    done = sensor(pose(0, 0), (now += 100));
  }
  assert.ok(done, "完全静止 60s 完成");

  // 位置移动重置
  sensor = createSpaceQuestSensor("let_the_room_settle");
  now = 1_000;
  sensor(pose(0, 0), now);
  for (let i = 0; i < 300; i++) sensor(pose(0, 0), (now += 100)); // 30s
  sensor(pose(0.05, 0), (now += 100)); // 明显移动 → 重置
  for (let i = 0; i < 300; i++) assert.equal(sensor(pose(0.05, 0), (now += 100)), false);
  // 到 60s 才完成
  for (let i = 0; i < 301 && !done; i++) done = sensor(pose(0.05, 0), (now += 100));
  assert.ok(done);

  // 只转头(yaw)也重置
  sensor = createSpaceQuestSensor("let_the_room_settle");
  sensor(pose(0, 0, 0, 0), 1_000);
  sensor(pose(0, 0, 0, 0.5), 31_000); // yaw 变化 → 重置计时起点
  assert.equal(sensor(pose(0, 0, 0, 0.5), 61_500), false, "转头后 30.5s 不算满 60s");
  assert.equal(sensor(pose(0, 0, 0, 0.5), 61_100 + 1_000), false);

  // 外部重置事件(失焦/Overlay/解除控制)
  sensor = createSpaceQuestSensor("let_the_room_settle");
  now = 1_000;
  sensor(pose(0, 0), now);
  for (let i = 0; i < 400; i++) sensor(pose(0, 0), (now += 100)); // 40s
  sensor({ type: "stillness-reset" }, (now += 100));
  for (let i = 0; i < 200; i++) sensor(pose(0, 0), (now += 100));
  assert.equal(sensor(pose(0, 0), now), false, "外部重置后 20s 不得完成");
});

test("three_encounters: 按唯一 exhibit ID 计数,重复不计", () => {
  const sensor = createSpaceQuestSensor("three_encounters");
  const now = 1_000;
  assert.equal(sensor({ type: "work-opened", exhibitId: "a" }, now), false);
  assert.equal(sensor({ type: "work-opened", exhibitId: "a" }, now), false, "重复 ID 不计");
  assert.equal(sensor({ type: "work-opened", exhibitId: "b" }, now), false);
  assert.equal(sensor({ type: "work-opened", exhibitId: "c" }, now), true);
});

test("dont_look_away: 同一目标持续 30s 完成;丢失超宽限或打开作品重置", () => {
  // 完成路径
  let sensor = createSpaceQuestSensor("dont_look_away");
  let now = 1_000;
  sensor({ type: "work-targeted", exhibitId: "x" }, now);
  let done = false;
  for (let i = 0; i < Math.ceil(WORK_GAZE_HOLD_MS / 100) + 2 && !done; i++) {
    done = sensor({ type: "work-targeted", exhibitId: "x" }, (now += 100));
  }
  assert.ok(done, "同目标 30s 完成");

  // 250ms 内恢复不算中断
  sensor = createSpaceQuestSensor("dont_look_away");
  now = 1_000;
  sensor({ type: "work-targeted", exhibitId: "x" }, now);
  for (let i = 0; i < 100; i++) sensor({ type: "work-targeted", exhibitId: "x" }, (now += 100)); // 10s
  sensor({ type: "work-targeted", exhibitId: null }, (now += 100)); // 丢失
  sensor({ type: "work-targeted", exhibitId: "x" }, (now += 200)); // 200ms 后恢复(<250ms 宽限)
  done = false;
  for (let i = 0; i < Math.ceil(WORK_GAZE_HOLD_MS / 100) + 2 && !done; i++) {
    done = sensor({ type: "work-targeted", exhibitId: "x" }, (now += 100));
  }
  assert.ok(done, "宽限内恢复,累计不清零");

  // 丢失超宽限 → 重置
  sensor = createSpaceQuestSensor("dont_look_away");
  now = 1_000;
  sensor({ type: "work-targeted", exhibitId: "x" }, now);
  for (let i = 0; i < 100; i++) sensor({ type: "work-targeted", exhibitId: "x" }, (now += 100));
  sensor({ type: "work-targeted", exhibitId: null }, (now += 100));
  sensor({ type: "work-targeted", exhibitId: "x" }, (now += WORK_GAZE_LOSS_GRACE_MS + 200));
  for (let i = 0; i < 100; i++) assert.equal(sensor({ type: "work-targeted", exhibitId: "x" }, (now += 100)), false, "重置后重新计时,10s 不得完成");

  // 打开作品 → 重置
  sensor = createSpaceQuestSensor("dont_look_away");
  now = 1_000;
  sensor({ type: "work-targeted", exhibitId: "x" }, now);
  for (let i = 0; i < 200; i++) sensor({ type: "work-targeted", exhibitId: "x" }, (now += 100));
  sensor({ type: "work-opened", exhibitId: "x" }, (now += 100));
  sensor({ type: "work-targeted", exhibitId: "x" }, (now += 100));
  for (let i = 0; i < 200; i++) assert.equal(sensor({ type: "work-targeted", exhibitId: "x" }, (now += 100)), false, "打开后重新计时");
});

test("another_angle: 单击不产生事件;有效拖拽事件直接完成", () => {
  const sensor = createSpaceQuestSensor("another_angle");
  assert.equal(sensor({ type: "work-targeted", exhibitId: "x" }, 1_000), false, "单击/注视不算拖拽");
  assert.equal(
    sensor({ type: "work-model-dragged", exhibitId: "x", rotationDeltaDeg: 6 }, 1_100),
    true,
  );
});

test("next_scene: 仅画面实际切换完成;首个画面是基线不算", () => {
  const sensor = createSpaceQuestSensor("next_scene");
  assert.equal(sensor({ type: "projector-slide-changed", slideId: "s1" }, 1_000), false, "初始画面只是基线");
  assert.equal(sensor({ type: "projector-slide-changed", slideId: "s2" }, 1_100), true, "切换到另一张才完成");
});

test("beyond_the_barrier / leave_the_floor: 对应事件到达即完成", () => {
  assert.equal(
    createSpaceQuestSensor("beyond_the_barrier")({ type: "closed-zone-hint-shown", zoneId: "z1" }, 0),
    true,
  );
  assert.equal(createSpaceQuestSensor("leave_the_floor")({ type: "jump-unlocked" }, 0), true);
});
