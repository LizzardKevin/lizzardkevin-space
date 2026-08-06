import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule } from "../helpers/projectPaths.mjs";

const {
  createSeededRng,
  selectExplorationTasks,
  SPACE_EXPLORATION_CATEGORIES,
  SPACE_EXPLORATION_POOL,
} = await importSourceModule("space/quests/spaceQuestSelection.ts");

test("当前启用任务池 10 项且 ID 全部唯一(规格四张任务表共 10 个定义)", () => {
  assert.equal(SPACE_EXPLORATION_POOL.length, 10);
  const ids = new Set(SPACE_EXPLORATION_POOL.map((task) => task.id));
  assert.equal(ids.size, SPACE_EXPLORATION_POOL.length, "无重复 ID");
});

test("池覆盖全部四类,暂空槽位不存在于运行时池", () => {
  for (const category of SPACE_EXPLORATION_CATEGORIES) {
    assert.ok(
      SPACE_EXPLORATION_POOL.some((task) => task.category === category),
      `${category} 至少一项`,
    );
  }
  assert.ok(!SPACE_EXPLORATION_POOL.some((task) => task.id === null || task.id === undefined));
});

test("每次抽取恰好 4 项、每类恰好 1 项、无重复 ID", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const drawn = selectExplorationTasks(SPACE_EXPLORATION_POOL, createSeededRng(seed));
    assert.equal(drawn.length, 4);
    const categories = drawn.map((task) => task.category).sort();
    assert.deepEqual(categories, [...SPACE_EXPLORATION_CATEGORIES].sort());
    assert.equal(new Set(drawn.map((task) => task.id)).size, 4);
  }
});

test("同一种子抽取结果可复现,不同种子有变化", () => {
  const a = selectExplorationTasks(SPACE_EXPLORATION_POOL, createSeededRng(42)).map((t) => t.id);
  const b = selectExplorationTasks(SPACE_EXPLORATION_POOL, createSeededRng(42)).map((t) => t.id);
  assert.deepEqual(a, b);
  const seen = new Set();
  for (let seed = 1; seed <= 20; seed++) {
    seen.add(selectExplorationTasks(SPACE_EXPLORATION_POOL, createSeededRng(seed)).map((t) => t.id).join(","));
  }
  assert.ok(seen.size > 1, "不同种子应产生不同组合");
});

test("条目不足一类时抛错(配置错误不静默)", () => {
  const broken = SPACE_EXPLORATION_POOL.filter((task) => task.category !== "works");
  assert.throws(() => selectExplorationTasks(broken, createSeededRng(1)), /missing category/);
});
