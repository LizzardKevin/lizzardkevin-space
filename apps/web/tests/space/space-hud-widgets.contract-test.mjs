import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { cssRule, declarationValue } from "../helpers/cssAssertions.mjs";
import { projectPath, readProjectFile, readSourceFile, readWebFile } from "../helpers/projectPaths.mjs";

/**
 * SPACE 探索提示 + 全息小地图的集成契约:
 * 字符串级断言保证两个 widget 始终挂在既有 HUD/pose/交互链路上,
 * 视觉与动效遵守探索提示系统规格(无框/空心方格/橙色填充/粗体 35% 文字)。
 */

const hud = readSourceFile("space/SpaceHud.tsx");
const desktop = readSourceFile("pages/SpaceDesktopExperience.tsx");
const questHud = readSourceFile("space/quests/SpaceQuestHud.tsx");
const quests = readSourceFile("space/quests/spaceQuests.ts");
const selection = readSourceFile("space/quests/spaceQuestSelection.ts");
const sensors = readSourceFile("space/quests/spaceQuestSensors.ts");
const projector = readSourceFile("scenes/projector/SpaceProjectorInstallation.tsx");
const tempBlocker = readSourceFile("scenes/gallery/TempBlockerNotices.tsx");
const workViewer = readSourceFile("pages/works/WorkModelViewer.tsx");
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
for (const gate of ["onboardingCompleted", "routeBlocked", "rendererFailed"]) {
  assert.ok(hud.includes(gate), `SpaceHud visibility gate must include ${gate}`);
}

// --- SpaceDesktopExperience:探索提示事件复用既有链路,pose ≤10Hz 且不进 React state ---
for (const hook of [
  "spaceExplorationStore.maybeActivateAt",
  'type: "pose-sampled"',
  'type: "work-opened"',
  'type: "work-targeted"',
  'type: "stillness-reset"',
]) {
  assert.ok(desktop.includes(hook), `SpaceDesktopExperience must dispatch ${hook}`);
}
assert.match(desktop, /SPACE_EXPLORATION_POSE_INTERVAL_MS\s*=\s*100/, "pose 事件必须节流到 10Hz");
for (const retiredJumpToken of ["leave_the_floor", "jump-unlocked", "space.jumpUnlocked"]) {
  assert.ok(!desktop.includes(retiredJumpToken), `desktop must retire ${retiredJumpToken}`);
  assert.ok(!selection.includes(retiredJumpToken), `selection must retire ${retiredJumpToken}`);
  assert.ok(!sensors.includes(retiredJumpToken), `sensors must retire ${retiredJumpToken}`);
  assert.ok(!i18n.includes(retiredJumpToken), `i18n must retire ${retiredJumpToken}`);
}
assert.ok(desktop.includes("poseRef={latestSpacePoseRef}"), "pose ref 必须透传给 SpaceHud");
assert.ok(!desktop.includes("questStore"), "旧 quest store 引用必须清干净");

// --- 探索提示 store/抽取/传感器 ---
for (const token of [
  "createSpaceExplorationStore",
  "spaceExplorationStore",
  "notifyOnboardingCompleted",
  "notifySessionRestart",
  "maybeActivateAt",
]) {
  assert.ok(quests.includes(token), `exploration store missing ${token}`);
}
assert.ok(
  quests.includes('phase = "armed"') || quests.includes('"armed"'),
  "store 必须实现 disabled→armed→active 阶段机",
);
assert.ok(selection.includes("selectExplorationTasks") && selection.includes("SPACE_EXPLORATION_POOL"));
assert.ok(sensors.includes("isInDownhillCorridor") && sensors.includes("SPACE_DOWNHILL_CORRIDOR"));
assert.ok(
  quests.includes("SPACE_EXPLORATION_STORAGE_KEY") && quests.includes("formatSpaceResumeLocalDate"),
  "探索提示按 daily resume 同款同日持久化(刷新后续玩)",
);
assert.ok(
  quests.includes("isPastDownhillCorridor"),
  "已过走廊的 resume 位姿必须直接激活面板",
);
assert.ok(
  !selection.includes("localStorage") && !sensors.includes("localStorage"),
  "抽取与传感器不直接读写存储",
);

// --- 事件源:投影实际切换 / 阻挡提示实际显示 / 模型有效拖拽 ---
assert.ok(projector.includes('"projector-slide-changed"'), "投影必须在画面真正切换后投递事件");
assert.ok(tempBlocker.includes('"closed-zone-hint-shown"'), "阻挡提示必须在真正显示时投递事件");
assert.ok(workViewer.includes('"work-model-dragged"'), "作品页必须识别有效拖拽后投递事件");

// --- HUD 文案:i18n runtime 增量,只显示暗示性名称 ---
assert.ok(questHud.includes('"space.exploration.label"'), "HUD 标题走 i18n");
assert.ok(questHud.includes("space.exploration.tasks."), "任务名走 i18n 动态键");
for (const copy of [
  "EXPLORE",
  "THE LONG WAY",
  "WHAT'S ABOVE",
  "LET THE ROOM SETTLE",
  "THREE ENCOUNTERS",
  "DON'T LOOK AWAY",
  "ANOTHER ANGLE",
  "NEXT SCENE",
  "BEYOND THE BARRIER",
  "漫长路径",
  "屏障之后",
]) {
  assert.ok(i18n.includes(copy), `i18n runtime augmentation must define ${copy}`);
}
assert.ok(!questHud.includes("Toast"), "探索提示不使用 toast");

// --- 小地图渲染边界:独立 renderer,不进主 Canvas 的 R3F 帧循环/后处理 ---
assert.ok(minimap.includes("createWebGPURenderer"), "小地图必须复用叠层 renderer 工厂");
assert.ok(!minimap.includes("useFrame"), "小地图不得使用 R3F useFrame(会抢占主渲染循环)");
assert.ok(!minimap.includes("GalleryRenderPipeline"), "小地图不得触碰主后处理管线");
assert.ok(minimap.includes("colors.signal"), "玩家点必须使用既有 signal 橙色 token");
assert.ok(
  minimap.includes("SPACE_MINIMAP_LAYER_OPACITY") && minimap.includes("colors.paper"),
  "全息模型必须是纯白分层透明度材质",
);
assert.ok(
  minimapModel.includes("buildSpaceMinimapModel") && minimapModel.includes("buildSpaceHologramModel"),
  "运行时剥离与离线 GLB 两条实现路径必须并存保留",
);
assert.ok(
  minimap.includes("SPACE_MINIMAP_GLB_URL") && minimap.includes("SPACE_MINIMAP_SOURCE"),
  "地图模型来源必须经 SPACE_MINIMAP_SOURCE 显式切换",
);
assert.ok(
  existsSync(projectPath("apps/web/public/models/space_minimap_strip.glb")),
  "由 minimap:generate 生成的 space_minimap_strip.glb 必须随代码一并提交",
);
assert.ok(
  minimap.includes("resolveSpaceMinimapFloorAt") && minimap.includes("SPACE_MINIMAP_PIECE_HIGHLIGHT"),
  "地图必须做站立面检测并以墨绿半透明点亮",
);
assert.ok(
  minimap.includes("easeOutBack") && minimap.includes("easeInOutCubic"),
  "点亮/熄灭必须是非线性补间",
);
const floorDetect = readSourceFile("space/minimap/minimapFloorDetect.ts");
assert.ok(
  floorDetect.includes("SPACE_MINIMAP_FEET_OFFSET") && floorDetect.includes("resolveSpaceMinimapFloorAt"),
  "站立检测必须是纯空间判定的独立可测模块",
);
const exportTool = readWebFile("tools/export-space-minimap.ts");
assert.ok(
  exportTool.includes('MAP_${piece.kind === "stair" ? "STAIR" : "FLOOR"}_'),
  "生成脚本必须逐块导出楼板/楼梯节点",
);
assert.ok(
  packageJson.scripts["minimap:generate"] === "node scripts/generate-space-minimap-glb.mjs",
  "展厅更新后同步小地图的生成脚本必须注册",
);
assert.ok(minimap.includes("depthTest: false"), "玩家点必须穿透墙体(BOTW 式 xray dot)");
assert.match(minimapModel, /"ARCH_"/);
assert.doesNotMatch(minimapModel, /"COL_|"EXHIBITS_/, "地图模型不得包含碰撞体与展品前缀");
assert.ok(minimapCamera.includes("spaceMinimapAzimuthForYaw"), "方位角映射必须是独立可测函数");
assert.ok(
  minimapCamera.includes("resolveSpaceMinimapElevationRad") &&
    minimap.includes("resolveSpaceMinimapElevationRad"),
  "地图仰角必须经独立函数轻微跟随玩家 pitch",
);

// --- 探索提示 CSS 规格 ---
assert.equal(declarationValue(cssRule(css, ".space-quests__check"), "width"), "8px", "方格 7-8px");
assert.equal(
  declarationValue(cssRule(css, ".space-quests__check"), "background"),
  "transparent",
  "未完成方格必须空心",
);
{
  const doneCheck = cssRule(css, ".space-quests__row[data-done] .space-quests__check");
  assert.equal(declarationValue(doneCheck, "background"), "var(--space-signal)", "完成方格填项目橙");
  const doneLabel = cssRule(css, ".space-quests__row[data-done] .space-quests__label");
  assert.equal(declarationValue(doneLabel, "opacity"), "0.35", "完成文字透明度精确 0.35");
  assert.equal(declarationValue(doneLabel, "font-weight"), "700", "完成文字必须粗体");
  const check = cssRule(css, ".space-quests__check");
  assert.match(declarationValue(check, "transition"), /160ms/, "方格填充过渡约 160ms");
  const label = cssRule(css, ".space-quests__label");
  assert.match(declarationValue(label, "transition"), /180ms/, "文字淡化过渡约 180ms");
  const row = cssRule(css, ".space-quests__row[data-done]");
  assert.doesNotMatch(row, /text-decoration|display:\s*none/, "完成项不打删除线、不隐藏");
  const frame = declarationValue(cssRule(css, ".space-quests__frame"), "padding");
  assert.ok(frame, "面板容器仅承担布局");
  assert.doesNotMatch(
    cssRule(css, ".space-quests__frame"),
    /background|border|box-shadow/,
    "面板无背景板/边框/阴影",
  );
}
assert.match(
  css,
  /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.space-quests__check[\s\S]*?transition:\s*none;/,
  "reduced-motion 下方格/文字直接切换无过渡",
);

// --- 小地图 CSS ---
assert.match(css, /\.space-quests\s*\{[\s\S]*?z-index:\s*9;/, "quest panel stays below the topbar");
assert.match(css, /\.space-minimap\s*\{[\s\S]*?z-index:\s*9;/, "minimap stays below the topbar");
{
  const minimapRule = /\.space-minimap\s*\{([^}]*?)\}/.exec(css)?.[1] ?? "";
  assert.ok(!/border|background/.test(minimapRule), "全息地图无外框无底色");
  assert.ok(!css.includes(".space-minimap__frame") && !css.includes(".space-minimap__label"));
}

// --- 测试注册(仓库约定:脚本显式枚举测试文件) ---
for (const file of [
  "space-quests.test.mjs",
  "space-quest-selection.test.mjs",
  "space-quest-sensors.test.mjs",
  "space-minimap.test.mjs",
  "space-minimap-floor-detect.test.mjs",
]) {
  assert.match(packageJson.scripts["test:unit"], new RegExp(file.replace(".", "\\.")), `${file} 必须注册进 test:unit`);
}
assert.match(packageJson.scripts["test:contracts"], /space-hud-widgets\.contract-test\.mjs/);

console.log("space HUD widgets contract tests passed");
