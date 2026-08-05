import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

const {
  createSpaceQuestStore,
  SPACE_QUEST_EXHIBIT_TARGET,
  SPACE_QUEST_IDS,
  SPACE_QUEST_SKY_GAZE_HOLD_MS,
  SPACE_QUEST_SKY_GAZE_PITCH_RAD,
} = await importSourceModule("space/quests/spaceQuests.ts");

const ABOVE_SKY_GAZE_THRESHOLD = SPACE_QUEST_SKY_GAZE_PITCH_RAD + 0.2;
const BELOW_SKY_GAZE_THRESHOLD = SPACE_QUEST_SKY_GAZE_PITCH_RAD - 0.4;

test("fresh store starts with every quest active and nothing done", () => {
  const store = createSpaceQuestStore();
  const state = store.getState();
  assert.equal(state.doneCount, 0);
  assert.equal(state.totalCount, SPACE_QUEST_IDS.length);
  assert.equal(state.allDone, false);
  for (const id of SPACE_QUEST_IDS) {
    assert.equal(state.quests[id].status, "active", `${id} starts active`);
  }
  assert.equal(state.quests.exhibitTour.target, SPACE_QUEST_EXHIBIT_TARGET);
});

test("exhibit tour counts unique exhibits and completes at the target", () => {
  const store = createSpaceQuestStore();
  let emissions = 0;
  store.subscribe(() => {
    emissions += 1;
  });

  store.recordExhibitView("exhibit-a");
  store.recordExhibitView("exhibit-a");
  assert.equal(store.getState().quests.exhibitTour.progress, 1, "duplicate views do not count");
  assert.equal(emissions, 1, "duplicate views do not emit");

  store.recordExhibitView("exhibit-b");
  assert.equal(store.getState().quests.exhibitTour.status, "active");
  store.recordExhibitView("exhibit-c");
  const state = store.getState();
  assert.equal(state.quests.exhibitTour.progress, SPACE_QUEST_EXHIBIT_TARGET);
  assert.equal(state.quests.exhibitTour.status, "done");

  store.recordExhibitView("exhibit-d");
  assert.equal(
    store.getState().quests.exhibitTour.progress,
    SPACE_QUEST_EXHIBIT_TARGET,
    "progress stays capped at the target",
  );
});

test("exhibit tour ignores empty ids", () => {
  const store = createSpaceQuestStore();
  store.recordExhibitView("");
  assert.equal(store.getState().quests.exhibitTour.progress, 0);
});

test("one-shot quests complete idempotently", () => {
  const store = createSpaceQuestStore();
  let emissions = 0;
  store.subscribe(() => {
    emissions += 1;
  });

  store.recordProjectorCommand();
  store.recordProjectorCommand();
  assert.equal(store.getState().quests.projectorControl.status, "done");
  assert.equal(emissions, 1, "second projector command is a no-op");

  store.recordJumpUnlocked();
  store.recordJumpUnlocked();
  assert.equal(store.getState().quests.jumpUnlock.status, "done");
  assert.equal(emissions, 2, "second jump unlock is a no-op");
});

test("sky gaze accumulates only above the pitch threshold and completes after the hold time", () => {
  const store = createSpaceQuestStore();
  let nowMs = 1_000;
  store.sampleSkyGaze(ABOVE_SKY_GAZE_THRESHOLD, nowMs); // 首个样本只建立时间基准
  nowMs += 100;
  store.sampleSkyGaze(ABOVE_SKY_GAZE_THRESHOLD, nowMs);
  nowMs += 100;
  store.sampleSkyGaze(BELOW_SKY_GAZE_THRESHOLD, nowMs); // 低于阈值不计入
  nowMs += 100;
  store.sampleSkyGaze(ABOVE_SKY_GAZE_THRESHOLD, nowMs);
  assert.equal(store.getState().quests.skyGaze.status, "active", "200ms 不足以完成");

  while (store.getState().quests.skyGaze.status !== "done") {
    nowMs += 100;
    store.sampleSkyGaze(ABOVE_SKY_GAZE_THRESHOLD, nowMs);
  }
  const elapsedMs = nowMs - 1_000;
  assert.ok(
    elapsedMs >= SPACE_QUEST_SKY_GAZE_HOLD_MS + 100, // 首次采样 + 低于阈值的 100ms 不计入
    "完成需要累计足够抬头时长",
  );
  assert.equal(store.getState().allDone, false, "其余任务未完成时 allDone 仍为 false");
});

test("sky gaze clamps huge frame gaps instead of counting them wholesale", () => {
  const store = createSpaceQuestStore();
  store.sampleSkyGaze(ABOVE_SKY_GAZE_THRESHOLD, 1_000);
  store.sampleSkyGaze(ABOVE_SKY_GAZE_THRESHOLD, 61_000); // 60s 掉帧/切后台,最多计 120ms
  store.sampleSkyGaze(ABOVE_SKY_GAZE_THRESHOLD, 61_100);
  assert.equal(
    store.getState().quests.skyGaze.status,
    "active",
    "单次大间隔不能直接完成任务",
  );
});

test("snapshots are replaced immutably so useSyncExternalStore sees changes", () => {
  const store = createSpaceQuestStore();
  const before = store.getState();
  store.recordProjectorCommand();
  const after = store.getState();
  assert.notEqual(before, after, "state object identity changes on emission");
  assert.equal(before.quests.projectorControl.status, "active", "旧快照不被改写");
  assert.equal(after.quests.projectorControl.status, "done");
  assert.equal(store.getState(), after, "无变化时保持同一引用");
});

test("unsubscribe stops notifications", () => {
  const store = createSpaceQuestStore();
  let emissions = 0;
  const unsubscribe = store.subscribe(() => {
    emissions += 1;
  });
  store.recordJumpUnlocked();
  unsubscribe();
  store.recordProjectorCommand();
  assert.equal(emissions, 1);
});

test("all quests done flips allDone exactly once", () => {
  const store = createSpaceQuestStore();
  let emissions = 0;
  store.subscribe(() => {
    emissions += 1;
  });

  for (const id of ["a", "b", "c"]) store.recordExhibitView(id);
  store.recordProjectorCommand();
  store.recordJumpUnlocked();
  let nowMs = 0;
  while (store.getState().quests.skyGaze.status !== "done") {
    nowMs += 100;
    store.sampleSkyGaze(ABOVE_SKY_GAZE_THRESHOLD, nowMs);
  }
  const state = store.getState();
  assert.equal(state.allDone, true);
  assert.equal(state.doneCount, state.totalCount);

  const emissionsAtCompletion = emissions;
  store.recordJumpUnlocked();
  store.recordExhibitView("another");
  assert.equal(emissions, emissionsAtCompletion, "完成后重复事件不再发通知");
});
