import assert from "node:assert/strict";
import { readProjectFile, readSourceFile } from "../helpers/projectPaths.mjs";

/**
 * SPACE 探索目标 + 全息小地图的集成契约:
 * 字符串级断言保证两个 widget 始终挂在既有 HUD/pose/交互链路上,
 * 且视觉走 token 化 CSS,不引入第二个主题。
 */

const hud = readSourceFile("space/SpaceHud.tsx");
const desktop = readSourceFile("pages/SpaceDesktopExperience.tsx");
const questHud = readSourceFile("space/quests/SpaceQuestHud.tsx");
const quests = readSourceFile("space/quests/spaceQuests.ts");
const minimap = readSourceFile("space/minimap/SpaceMinimap.tsx");
const minimapModel = readSourceFile("space/minimap/minimapModel.ts");
const minimapCamera = readSourceFile("space/minimap/minimapCamera.ts");
const i18n = readSourceFile("i18n/i18n.ts");
const css = readSourceFile("styles/global.css");
const packageJson = JSON.parse(readProjectFile("package.json"));

// --- SpaceHud 挂载与可见性门 ---
for (const widget of ["SpaceQuestHud", "SpaceMinimap"]) {
  assert.ok(hud.includes(widget), `SpaceHud must mount ${widget}`);
}
assert.match(hud, /widgetsVisible/, "两个 widget 共享同一个可见性门");
for (const gate of ["onboardingCompleted", "routeBlocked", "focusOpen", "rendererFailed"]) {
  assert.ok(hud.includes(gate), `SpaceHud visibility gate must include ${gate}`);
}

// --- SpaceDesktopExperience 挂钩既有交互事件,不新建平行链路 ---
for (const hook of [
  "recordExhibitView",
  "recordProjectorCommand",
  "recordJumpUnlocked",
  "sampleSkyGaze",
]) {
  assert.ok(desktop.includes(hook), `SpaceDesktopExperience must call questStore.${hook}`);
}
assert.ok(
  desktop.includes('messageKey === "space.jumpUnlocked"'),
  "解锁跳跃任务必须复用既有 jump notice,而不是另造键盘监听",
);
assert.ok(
  desktop.includes("questStore={questStore}") && desktop.includes("poseRef={latestSpacePoseRef}"),
  "quest store 与每帧 pose ref 必须透传给 SpaceHud",
);

// --- 任务文案走 i18n runtime 增量(不动 generated content) ---
for (const key of [
  "space.quests.title",
  "space.quests.exhibitTour",
  "space.quests.projectorControl",
  "space.quests.skyGaze",
  "space.quests.jumpUnlock",
  "space.quests.allDone",
]) {
  assert.ok(questHud.includes(`"${key}"`), `SpaceQuestHud must read ${key} from i18n`);
}
assert.ok(minimap.includes('"space.map.label"'), "SpaceMinimap must read space.map.label from i18n");
for (const copy of ["探索目标", "EXPLORATION", "解锁跳跃", "Unlock jumping", "地图", "MAP"]) {
  assert.ok(i18n.includes(copy), `i18n runtime augmentation must define ${copy}`);
}
assert.ok(
  !quests.includes("localStorage") && !questHud.includes("localStorage"),
  "探索目标是会话内状态,不写入 localStorage",
);

// --- 小地图渲染边界:独立 renderer,不进主 Canvas 的 R3F 帧循环/后处理 ---
assert.ok(minimap.includes("createWebGPURenderer"), "小地图必须复用叠层 renderer 工厂");
assert.ok(!minimap.includes("useFrame"), "小地图不得使用 R3F useFrame(会抢占主渲染循环)");
assert.ok(!minimap.includes("GalleryRenderPipeline"), "小地图不得触碰主后处理管线");
assert.ok(minimap.includes("colors.signal"), "玩家点必须使用既有 signal 橙色 token");
assert.ok(minimap.includes("depthTest: false"), "玩家点必须穿透墙体(BOTW 式 xray dot)");
assert.match(minimapModel, /"ARCH_"/);
assert.doesNotMatch(minimapModel, /"COL_|"EXHIBITS_/, "地图模型不得包含碰撞体与展品前缀");
assert.ok(
  minimapModel.includes("createInkShellGeometry"),
  "地图墨线必须复用主场景 inverted-hull 工具",
);
assert.ok(
  minimapCamera.includes("spaceMinimapAzimuthForYaw"),
  "方位角映射必须是独立可测函数",
);

// --- CSS:同一家族的粗边框/硬阴影面板,reduced-motion 只收非必要动效 ---
for (const selector of [".space-quests", ".space-quests__check", ".space-minimap", ".space-minimap__canvas"]) {
  assert.ok(css.includes(selector), `global.css must style ${selector}`);
}
assert.match(css, /\.space-quests\s*\{[\s\S]*?z-index:\s*9;/, "quest panel stays below the topbar");
assert.match(css, /\.space-minimap\s*\{[\s\S]*?z-index:\s*9;/, "minimap stays below the topbar");
assert.match(
  css,
  /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.space-quests__row\[data-done\] \.space-quests__check[\s\S]*?animation: none;/,
  "reduced-motion must still cover the new HUD widgets",
);
assert.ok(css.includes("var(--space-signal)"), "quest current marker uses the signal token");
assert.ok(css.includes("var(--space-hud-panel)"), "widget frames reuse the HUD panel token");

// --- 测试注册(仓库约定:脚本显式枚举测试文件) ---
assert.match(packageJson.scripts["test:unit"], /space-quests\.test\.mjs/);
assert.match(packageJson.scripts["test:unit"], /space-minimap\.test\.mjs/);
assert.match(packageJson.scripts["test:contracts"], /space-hud-widgets\.contract-test\.mjs/);

console.log("space HUD widgets contract tests passed");
