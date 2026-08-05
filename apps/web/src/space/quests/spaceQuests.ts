/**
 * SPACE 探索目标(软引导任务):轻量、会话内、无惩罚的体验清单。
 * 纯 TS 实现,无 DOM/存储依赖,node --test 可直接覆盖;
 * React 侧通过 useSyncExternalStore(store.subscribe, store.getState) 订阅。
 */

export const SPACE_QUEST_IDS = [
  "exhibitTour",
  "projectorControl",
  "skyGaze",
  "jumpUnlock",
] as const;

export type SpaceQuestId = (typeof SPACE_QUEST_IDS)[number];

export type SpaceQuestStatus = "active" | "done";

export type SpaceQuestSnapshot = Readonly<{
  status: SpaceQuestStatus;
  progress: number;
  target: number;
}>;

export type SpaceQuestsSnapshot = Readonly<{
  quests: Readonly<Record<SpaceQuestId, SpaceQuestSnapshot>>;
  doneCount: number;
  totalCount: number;
  allDone: boolean;
}>;

/** 「查看三个展品」目标数量。 */
export const SPACE_QUEST_EXHIBIT_TARGET = 3;

/** 「仰望天窗」:俯仰角阈值(约 55°)与累计保持时长。 */
export const SPACE_QUEST_SKY_GAZE_PITCH_RAD = 0.96;
export const SPACE_QUEST_SKY_GAZE_HOLD_MS = 1500;

/** 掉帧/切后台时的单帧最大计入间隔,避免大间隔被一次性累计。 */
const SKY_GAZE_MAX_FRAME_MS = 120;

type SpaceQuestListener = () => void;

export type SpaceQuestStore = ReturnType<typeof createSpaceQuestStore>;

export function createSpaceQuestStore() {
  const viewedExhibitIds = new Set<string>();
  let projectorDone = false;
  let jumpDone = false;
  let skyGazeAccumulatedMs = 0;
  let lastSkySampleMs: number | null = null;

  let snapshot = buildSnapshot();
  const listeners = new Set<SpaceQuestListener>();

  function buildSnapshot(): SpaceQuestsSnapshot {
    const exhibitProgress = Math.min(viewedExhibitIds.size, SPACE_QUEST_EXHIBIT_TARGET);
    const quests: Record<SpaceQuestId, SpaceQuestSnapshot> = {
      exhibitTour: {
        status: exhibitProgress >= SPACE_QUEST_EXHIBIT_TARGET ? "done" : "active",
        progress: exhibitProgress,
        target: SPACE_QUEST_EXHIBIT_TARGET,
      },
      projectorControl: { status: projectorDone ? "done" : "active", progress: projectorDone ? 1 : 0, target: 1 },
      skyGaze: { status: skyGazeAccumulatedMs >= SPACE_QUEST_SKY_GAZE_HOLD_MS ? "done" : "active", progress: 0, target: 1 },
      jumpUnlock: { status: jumpDone ? "done" : "active", progress: jumpDone ? 1 : 0, target: 1 },
    };
    const doneCount = SPACE_QUEST_IDS.filter((id) => quests[id].status === "done").length;
    return {
      quests,
      doneCount,
      totalCount: SPACE_QUEST_IDS.length,
      allDone: doneCount === SPACE_QUEST_IDS.length,
    };
  }

  function emit() {
    snapshot = buildSnapshot();
    for (const listener of listeners) listener();
  }

  function recordExhibitView(exhibitId: string) {
    if (typeof exhibitId !== "string" || exhibitId.length === 0) return;
    if (viewedExhibitIds.size >= SPACE_QUEST_EXHIBIT_TARGET) return;
    if (viewedExhibitIds.has(exhibitId)) return;
    viewedExhibitIds.add(exhibitId);
    emit();
  }

  function recordProjectorCommand() {
    if (projectorDone) return;
    projectorDone = true;
    emit();
  }

  function recordJumpUnlocked() {
    if (jumpDone) return;
    jumpDone = true;
    emit();
  }

  /**
   * 每帧位姿采样:仅累计抬头超过阈值的时长;掉帧大间隔按上限截断。
   * 完成前不发任何事件(避免每帧通知),完成时只发一次。
   */
  function sampleSkyGaze(pitchRad: number, nowMs: number) {
    if (skyGazeAccumulatedMs >= SPACE_QUEST_SKY_GAZE_HOLD_MS) return;
    if (!Number.isFinite(pitchRad) || !Number.isFinite(nowMs)) return;
    if (lastSkySampleMs !== null) {
      const deltaMs = Math.min(Math.max(nowMs - lastSkySampleMs, 0), SKY_GAZE_MAX_FRAME_MS);
      if (pitchRad >= SPACE_QUEST_SKY_GAZE_PITCH_RAD) {
        skyGazeAccumulatedMs += deltaMs;
      }
    }
    lastSkySampleMs = nowMs;
    if (skyGazeAccumulatedMs >= SPACE_QUEST_SKY_GAZE_HOLD_MS) emit();
  }

  return {
    subscribe(listener: SpaceQuestListener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getState() {
      return snapshot;
    },
    recordExhibitView,
    recordProjectorCommand,
    recordJumpUnlocked,
    sampleSkyGaze,
  };
}
