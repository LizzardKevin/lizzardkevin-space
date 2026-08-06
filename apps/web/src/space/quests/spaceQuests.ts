import {
  selectExplorationTasks,
  SPACE_EXPLORATION_POOL,
  type SpaceExplorationTaskDef,
} from "./spaceQuestSelection.ts";
import {
  createSpaceQuestSensor,
  isInDownhillCorridor,
  type SpaceExplorationEvent,
  type SpaceQuestSensor,
} from "./spaceQuestSensors.ts";

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

export type SpaceExplorationStore = ReturnType<typeof createSpaceExplorationStore>;

export function createSpaceExplorationStore() {
  let phase: SpaceExplorationPhase = "disabled";
  let tasks: SpaceExplorationTaskState[] = [];
  let sensors = new Map<string, SpaceQuestSensor>();
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
    emit();
  }

  /** pose 流里调用:armed 且进入下坡走廊时抽取 4 项任务,进入 active。 */
  function maybeActivateAt(position: readonly [number, number, number], rng?: () => number) {
    if (phase !== "armed") return;
    if (!isInDownhillCorridor(position)) return;
    const drawn = selectExplorationTasks(SPACE_EXPLORATION_POOL, rng ?? Math.random);
    tasks = drawn.map((task) => ({ id: task.id, category: task.category, status: "active" }));
    sensors = new Map(drawn.map((task) => [task.id, createSpaceQuestSensor(task.id)]));
    phase = "active";
    emit();
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
    if (changed) emit();
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
