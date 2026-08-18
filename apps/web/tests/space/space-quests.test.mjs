import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

const { createSpaceExplorationStore } = await importSourceModule("space/quests/spaceQuests.ts");
const { createSeededRng, SPACE_EXPLORATION_CATEGORIES } = await importSourceModule(
  "space/quests/spaceQuestSelection.ts",
);
const { isInDownhillCorridor, SPACE_DOWNHILL_CORRIDOR } = await importSourceModule(
  "space/quests/spaceQuestSensors.ts",
);

const INSIDE_CORRIDOR = [
  (SPACE_DOWNHILL_CORRIDOR.minX + SPACE_DOWNHILL_CORRIDOR.maxX) / 2,
  33,
  (SPACE_DOWNHILL_CORRIDOR.minZ + SPACE_DOWNHILL_CORRIDOR.maxZ) / 2,
];
const SPAWN_POSE = [-0.51, 36.897, -48.318];

function activateStore(store, seed = 7) {
  store.notifyOnboardingCompleted();
  store.maybeActivateAt(INSIDE_CORRIDOR, createSeededRng(seed));
}

test("初始 disabled;引导完成转 armed;走廊外不激活", () => {
  const store = createSpaceExplorationStore();
  assert.equal(store.getState().phase, "disabled");
  store.notifySessionRestart();
  assert.equal(store.getState().phase, "disabled", "disabled 下会话重启无效果");

  store.notifyOnboardingCompleted();
  assert.equal(store.getState().phase, "armed");
  store.maybeActivateAt(SPAWN_POSE, createSeededRng(1));
  assert.equal(store.getState().phase, "armed", "出生点不在走廊,不抽取");
  assert.equal(store.getState().tasks.length, 0);
});

test("armed 进入下坡走廊抽 4 项:每类一项、无重复", () => {
  const store = createSpaceExplorationStore();
  activateStore(store);
  const state = store.getState();
  assert.equal(state.phase, "active");
  assert.equal(state.tasks.length, 4);
  assert.deepEqual(
    [...state.tasks.map((t) => t.category)].sort(),
    [...SPACE_EXPLORATION_CATEGORIES].sort(),
  );
  assert.equal(new Set(state.tasks.map((t) => t.id)).size, 4);
  assert.equal(state.doneCount, 0);
  assert.equal(state.allDone, false);
});

test("走廊范围与实测坡道一致:出生点/远点排除,坡道内命中", () => {
  assert.equal(isInDownhillCorridor(SPAWN_POSE), false);
  assert.equal(isInDownhillCorridor([0, 33, -16]), true);
  assert.equal(isInDownhillCorridor([0, 33, -40]), false, "走廊外的 z 不命中");
  assert.equal(isInDownhillCorridor([10, 33, -16]), false, "走廊外的 x 不命中");
});

test("active 前 dispatch 无效;完成后幂等;快照不可变", () => {
  const store = createSpaceExplorationStore();
  store.dispatch({ type: "closed-zone-hint-shown", zoneId: "z" }, 1000);
  assert.equal(store.getState().doneCount, 0, "disabled 阶段事件无效");

  activateStore(store, 3);
  const ids = store.getState().tasks.map((t) => t.id);
  const eventFor = {
    three_encounters: { type: "work-opened", exhibitId: "a" },
    next_scene: { type: "projector-slide-changed", slideId: "s1" },
    beyond_the_barrier: { type: "closed-zone-hint-shown", zoneId: "z" },
  };
  // 找一个能一次性完成的瞬时任务来验证幂等
  const instantId = ids.find((id) => eventFor[id]);
  if (!instantId) return; // 本组合全是累计型任务,幂等由传感器测试覆盖
  const before = store.getState();
  store.dispatch(eventFor[instantId], 3000);
  const after = store.getState();
  assert.notEqual(before, after, "状态变化产生新快照");
  assert.equal(after.doneCount, before.doneCount + 1);
  const emissions = [];
  store.subscribe(() => emissions.push(1));
  store.dispatch(eventFor[instantId], 4000);
  store.dispatch(eventFor[instantId], 5000);
  assert.equal(emissions.length, 0, "已完成任务重复事件不再通知");
  assert.equal(store.getState().doneCount, after.doneCount, "完成计数不变");
});

test("Lobby 重进重抽;Focus/页面往返不重抽", () => {
  const store = createSpaceExplorationStore();
  activateStore(store, 11);
  const firstIds = store.getState().tasks.map((t) => t.id);

  // Focus/Profile/DevStories 往返不触发任何 store 调用 → 任务不变
  store.dispatch({ type: "work-targeted", exhibitId: "x" }, 1000);
  assert.deepEqual(store.getState().tasks.map((t) => t.id), firstIds, "页面往返任务不变");

  store.notifySessionRestart();
  assert.equal(store.getState().phase, "armed");
  assert.equal(store.getState().tasks.length, 0, "重进 Lobby 后任务清空待重抽");

  store.maybeActivateAt(INSIDE_CORRIDOR, createSeededRng(99));
  const second = store.getState();
  assert.equal(second.phase, "active");
  assert.equal(second.tasks.length, 4, "下一次进走廊重新抽满 4 项");
});

test("armed 状态下重复引导完成/重进不破坏状态", () => {
  const store = createSpaceExplorationStore();
  store.notifyOnboardingCompleted();
  store.notifyOnboardingCompleted();
  assert.equal(store.getState().phase, "armed");
  store.notifySessionRestart();
  assert.equal(store.getState().phase, "armed");
});

function createFakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => void map.set(key, String(value)),
    _map: map,
  };
}

const PAST_CORRIDOR = [0, 30, 0]; // z > -10.7,已在走廊之后

test("resume 位姿已过走廊:armed 直接激活,不要求走回走廊", () => {
  const store = createSpaceExplorationStore({ storage: createFakeStorage() });
  store.notifyOnboardingCompleted();
  store.maybeActivateAt(PAST_CORRIDOR, createSeededRng(5));
  const state = store.getState();
  assert.equal(state.phase, "active");
  assert.equal(state.tasks.length, 4);
});

test("当天持久化记录恢复:任务与完成态原样回来", async () => {
  const { formatSpaceResumeLocalDate } = await importSourceModule("space/spaceDailyResume.ts");
  const storage = createFakeStorage();
  storage.setItem(
    "spaceExplorationV1",
    JSON.stringify({
      version: 1,
      localDate: formatSpaceResumeLocalDate(new Date()),
      taskIds: ["the_long_way", "whats_above", "three_encounters", "next_scene"],
      doneIds: ["the_long_way"],
    }),
  );
  const store = createSpaceExplorationStore({ storage });
  store.notifyOnboardingCompleted();
  store.maybeActivateAt(PAST_CORRIDOR, createSeededRng(1));
  const state = store.getState();
  assert.deepEqual(
    state.tasks.map((t) => t.id),
    ["the_long_way", "whats_above", "three_encounters", "next_scene"],
    "恢复记录里的同一组任务与显示顺序",
  );
  assert.equal(state.tasks[0].status, "done");
  assert.equal(state.doneCount, 1);
});

test("失效记录(旧跳跃 ID / 未知 ID / 过期日期)重新抽取并覆写", async () => {
  const { formatSpaceResumeLocalDate } = await importSourceModule("space/spaceDailyResume.ts");
  for (const bad of [
    { version: 1, localDate: formatSpaceResumeLocalDate(new Date()), taskIds: ["leave_the_floor", "whats_above", "three_encounters", "next_scene"], doneIds: ["leave_the_floor"] },
    { version: 1, localDate: formatSpaceResumeLocalDate(new Date()), taskIds: ["bogus_id", "whats_above", "three_encounters", "next_scene"], doneIds: [] },
    { version: 1, localDate: "2000-01-01", taskIds: ["the_long_way", "whats_above", "three_encounters", "next_scene"], doneIds: [] },
  ]) {
    const storage = createFakeStorage();
    storage.setItem("spaceExplorationV1", JSON.stringify(bad));
    const store = createSpaceExplorationStore({ storage });
    store.notifyOnboardingCompleted();
    store.maybeActivateAt(PAST_CORRIDOR, createSeededRng(9));
    const ids = store.getState().tasks.map((t) => t.id);
    assert.equal(ids.length, 4);
    assert.ok(!ids.includes("bogus_id"), "未知 ID 的记录被丢弃并重新抽取");
    assert.ok(!ids.includes("leave_the_floor"), "旧跳跃任务不会恢复");
    assert.deepEqual(JSON.parse(storage.getItem("spaceExplorationV1")).taskIds, ids);
  }
});

test("Lobby 重进后的下一次激活跳过当天记录,重新抽取并覆写", async () => {
  const { formatSpaceResumeLocalDate } = await importSourceModule("space/spaceDailyResume.ts");
  const storage = createFakeStorage();
  const recordIds = ["the_long_way", "whats_above", "three_encounters", "next_scene"];
  storage.setItem(
    "spaceExplorationV1",
    JSON.stringify({
      version: 1,
      localDate: formatSpaceResumeLocalDate(new Date()),
      taskIds: recordIds,
      doneIds: [],
    }),
  );
  const store = createSpaceExplorationStore({ storage });
  store.notifyOnboardingCompleted();
  store.maybeActivateAt(PAST_CORRIDOR, createSeededRng(1));
  assert.deepEqual(store.getState().tasks.map((t) => t.id), recordIds, "首次激活恢复当天记录");
  store.notifySessionRestart();
  store.maybeActivateAt(PAST_CORRIDOR, createSeededRng(42));
  const ids = store.getState().tasks.map((t) => t.id);
  assert.equal(ids.length, 4);
  const persisted = JSON.parse(storage.getItem("spaceExplorationV1"));
  assert.deepEqual(persisted.taskIds, ids, "重抽结果覆写当天记录");
});
