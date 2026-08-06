/**
 * SPACE 自由探索提示:任务池与随机抽取。
 * 池共 20 个槽位、当前启用 11 项(暂空槽位不进入运行时池)。
 * 每次新会话从四类中各随机抽 1 项,共 4 项,再打乱显示顺序。
 */

export const SPACE_EXPLORATION_CATEGORIES = [
  "movement",
  "observation",
  "works",
  "interaction",
] as const;

export type SpaceExplorationCategory = (typeof SPACE_EXPLORATION_CATEGORIES)[number];

export type SpaceExplorationTaskId =
  | "leave_the_floor"
  | "the_long_way"
  | "whats_above"
  | "whats_below"
  | "let_the_room_settle"
  | "three_encounters"
  | "dont_look_away"
  | "another_angle"
  | "next_scene"
  | "beyond_the_barrier";

export type SpaceExplorationTaskDef = Readonly<{
  id: SpaceExplorationTaskId;
  category: SpaceExplorationCategory;
}>;

/** 当前启用池:10 项(规格四张任务表各 2/3/3/2 项;槽位预留 20)。 */
export const SPACE_EXPLORATION_POOL: readonly SpaceExplorationTaskDef[] = [
  { id: "leave_the_floor", category: "movement" },
  { id: "the_long_way", category: "movement" },
  { id: "whats_above", category: "observation" },
  { id: "whats_below", category: "observation" },
  { id: "let_the_room_settle", category: "observation" },
  { id: "three_encounters", category: "works" },
  { id: "dont_look_away", category: "works" },
  { id: "another_angle", category: "works" },
  { id: "next_scene", category: "interaction" },
  { id: "beyond_the_barrier", category: "interaction" },
];

/** Fisher–Yates 打乱(注入 rng 便于测试)。 */
export function shuffleWithRng<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * 每类各抽 1 项并打乱顺序。返回恰好 4 项、每类恰好 1 项、无重复 ID。
 * 池条目不足一类时抛错(配置错误应在测试期暴露,不是运行时静默)。
 */
export function selectExplorationTasks(
  pool: readonly SpaceExplorationTaskDef[],
  rng: () => number = Math.random,
): SpaceExplorationTaskDef[] {
  const picked: SpaceExplorationTaskDef[] = [];
  for (const category of SPACE_EXPLORATION_CATEGORIES) {
    const candidates = pool.filter((task) => task.category === category);
    if (candidates.length === 0) throw new Error(`exploration pool missing category: ${category}`);
    picked.push(candidates[Math.floor(rng() * candidates.length)]);
  }
  return shuffleWithRng(picked, rng);
}

/** 可复现的测试 rng(mulberry32)。 */
export function createSeededRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
