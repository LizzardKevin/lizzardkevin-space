import {
  selectExplorationTasks,
  SPACE_EXPLORATION_POOL,
  type SpaceExplorationTaskDef,
} from "./spaceQuestSelection.ts";
import {
  createSpaceQuestSensor,
  isInDownhillCorridor,
  isPastDownhillCorridor,
  type SpaceExplorationEvent,
  type SpaceQuestSensor,
} from "./spaceQuestSensors.ts";
import { formatSpaceResumeLocalDate } from "../spaceDailyResume.ts";

/**
 * SPACE 自由探索提示 store(演进自原 quest store)。
 * 阶段机:disabled →(新手引导完成)→ armed →(进入下坡走廊)→ active(抽取 4 项)。
 * 会话内模块单例:Focus/Profile/DevStories 往返不重抽;刷新或从 Lobby 重新进入时
 * 经 notifySessionRestart 重置为 armed(下一次进走廊重新抽取)。
 * 无持久化、无 React state 高频写入:pose 事件由调用方以 ≤10Hz 节流后 dispatch,
 * 仅在状态实际变化时通知订阅者。
 */

export type SpaceExplorationPhase = "disabled" | "armed" | "active";

export type SpaceExplorationTaskState = Readonly<{
  id: SpaceExplorationTaskDef["id"];
  category: SpaceExplorationTaskDef["category"];
  status: "active" | "done";
}>;

export type SpaceExplorationSnapshot = Readonly<{
  phase: SpaceExplorationPhase;
  tasks: readonly SpaceExplorationTaskState[];
  doneCount: number;
  totalCount: number;
  allDone: boolean;
}>;

type SpaceExplorationListener = () => void;

const EMPTY_SNAPSHOT: SpaceExplorationSnapshot = Object.freeze({
  phase: "disabled",
  tasks: Object.freeze([]),
  doneCount: 0,
  totalCount: 0,
  allDone: false,
});

/** 与 daily resume 同款的同日持久化:记录当天抽中的任务与完成态,刷新后恢复。 */
export const SPACE_EXPLORATION_STORAGE_KEY = "spaceExplorationV1";

type SpaceExplorationRecord = {
  version: 1;
  localDate: string;
  taskIds: string[];
  doneIds: string[];
};

type SpaceExplorationStorage = Pick<Storage, "getItem" | "setItem"> | null | undefined;

function getDefaultStorage(): SpaceExplorationStorage {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readSpaceExplorationRecord(
  storage: SpaceExplorationStorage,
  now = new Date(),
): SpaceExplorationRecord | null {
  try {
    const raw = storage?.getItem(SPACE_EXPLORATION_STORAGE_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw) as Partial<SpaceExplorationRecord>;
    if (record.version !== 1) return null;
    if (record.localDate !== formatSpaceResumeLocalDate(now)) return null;
    if (!Array.isArray(record.taskIds) || !Array.isArray(record.doneIds)) return null;
    const poolIds = new Set<string>(SPACE_EXPLORATION_POOL.map((task) => task.id));
    const taskIds = record.taskIds.filter((id): id is string => typeof id === "string");
    if (
      taskIds.length !== 4 ||
      new Set(taskIds).size !== 4 ||
      !taskIds.every((id) => poolIds.has(id))
    ) {
      return null;
    }
    const taskIdSet = new Set(taskIds);
    const doneIds = record.doneIds.filter(
      (id): id is string => typeof id === "string" && taskIdSet.has(id),
    );
    return { version: 1, localDate: record.localDate, taskIds, doneIds };
  } catch {
    return null;
  }
}

function writeSpaceExplorationRecord(
  storage: SpaceExplorationStorage,
  tasks: readonly SpaceExplorationTaskState[],
  now = new Date(),
) {
  try {
    const record: SpaceExplorationRecord = {
      version: 1,
      localDate: formatSpaceResumeLocalDate(now),
      taskIds: tasks.map((task) => task.id),
      doneIds: tasks.filter((task) => task.status === "done").map((task) => task.id),
    };
    storage?.setItem(SPACE_EXPLORATION_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // 探索提示的持久化是体验增强;存储失败不应打断 SPACE。
  }
}

export type SpaceExplorationStore = ReturnType<typeof createSpaceExplorationStore>;

export function createSpaceExplorationStore({
  storage = getDefaultStorage(),
}: {
  storage?: SpaceExplorationStorage;
} = {}) {
  let phase: SpaceExplorationPhase = "disabled";
  let tasks: SpaceExplorationTaskState[] = [];
  let sensors = new Map<string, SpaceQuestSensor>();
  /** Lobby 重进后的下一次激活跳过当天记录(保持“重进重抽”)。 */
  let skipRecordOnNextActivate = false;
  let snapshot: SpaceExplorationSnapshot = EMPTY_SNAPSHOT;
  const listeners = new Set<SpaceExplorationListener>();

  function rebuildSnapshot() {
    const doneCount = tasks.filter((task) => task.status === "done").length;
    snapshot = {
      phase,
      tasks: [...tasks],
      doneCount,
      totalCount: tasks.length,
      allDone: tasks.length > 0 && doneCount === tasks.length,
    };
  }

  function emit() {
    rebuildSnapshot();
    for (const listener of listeners) listener();
  }

  function persist() {
    if (phase !== "active" || tasks.length === 0) return;
    writeSpaceExplorationRecord(storage, tasks);
  }

  function activateWith(nextTasks: SpaceExplorationTaskState[]) {
    tasks = nextTasks;
    sensors = new Map(tasks.map((task) => [task.id, createSpaceQuestSensor(task.id)]));
    phase = "active";
  }

  function notifyOnboardingCompleted() {
    if (phase !== "disabled") return;
    phase = "armed";
    emit();
  }

  /** Lobby 重新进入:清空已抽任务,回到 armed(下一次进走廊重新抽取)。 */
  function notifySessionRestart() {
    if (phase === "disabled") return;
    if (phase === "armed" && tasks.length === 0) return;
    phase = "armed";
    tasks = [];
    sensors = new Map();
    skipRecordOnNextActivate = true;
    emit();
  }

  /**
   * pose 流里调用:armed 且(进入下坡走廊 或 已在走廊之后)时激活。
   * 激活优先恢复当天的持久化记录(刷新后续玩);记录缺失/失效/隔天才重新抽取。
   */
  function maybeActivateAt(position: readonly [number, number, number], rng?: () => number) {
    if (phase !== "armed") return;
    if (!isInDownhillCorridor(position) && !isPastDownhillCorridor(position)) return;
    const record = skipRecordOnNextActivate ? null : readSpaceExplorationRecord(storage);
    skipRecordOnNextActivate = false;
    if (record) {
      const doneIds = new Set(record.doneIds);
      const defsById = new Map<string, SpaceExplorationTaskDef>(
        SPACE_EXPLORATION_POOL.map((task) => [task.id, task]),
      );
      activateWith(
        record.taskIds.map((id) => {
          const def = defsById.get(id)!;
          return { id: def.id, category: def.category, status: doneIds.has(id) ? "done" : "active" };
        }),
      );
      emit();
      return;
    }
    const drawn = selectExplorationTasks(SPACE_EXPLORATION_POOL, rng ?? Math.random);
    activateWith(drawn.map((task) => ({ id: task.id, category: task.category, status: "active" })));
    emit();
    persist();
  }

  /** 事件入口:完成判定幂等(已完成任务的传感器不再被调用)。 */
  function dispatch(event: SpaceExplorationEvent, nowMs: number) {
    if (phase !== "active") return;
    let changed = false;
    tasks = tasks.map((task) => {
      if (task.status === "done") return task;
      const sensor = sensors.get(task.id);
      if (!sensor) return task;
      if (sensor(event, nowMs)) {
        changed = true;
        return { ...task, status: "done" };
      }
      return task;
    });
    if (changed) {
      emit();
      persist();
    }
  }

  return {
    subscribe(listener: SpaceExplorationListener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getState() {
      return snapshot;
    },
    notifyOnboardingCompleted,
    notifySessionRestart,
    maybeActivateAt,
    dispatch,
  };
}

/**
 * 会话级单例:SPACE HUD、投影仪、阻挡提示、作品页模型查看器都向它投递事件。
 * 模块状态随页面刷新自然重置;路由往返不重建。
 */
export const spaceExplorationStore = createSpaceExplorationStore();
