import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function readProjectFile(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
}

const files = {
  cursor: readProjectFile("apps/web/src/cursor/SpaceCursorOverlay.tsx"),
  cursorController: readProjectFile("apps/web/src/cursor/spaceCursorController.ts"),
  crosshair: readProjectFile("apps/web/src/components/Crosshair.tsx"),
  css: readProjectFile("apps/web/src/styles/global.css"),
  hoverHighlight: readProjectFile("apps/web/src/exhibits/ExhibitHoverHighlight.tsx"),
  player: readProjectFile("apps/web/src/scenes/Player/PlayerController.tsx"),
  pointerLock: readProjectFile("apps/web/src/space/requestSpacePointerLock.ts"),
  footsteps: readProjectFile("apps/web/src/scenes/Player/useFootsteps.ts"),
  topbar: readProjectFile("apps/web/src/components/TopBar.tsx"),
};

function cssBlock(selector) {
  const start = files.css.indexOf(`${selector} {`);
  assert(start >= 0, `${selector} CSS block must exist`);
  const end = files.css.indexOf("\n}", start);
  assert(end >= 0, `${selector} CSS block must close`);
  return files.css.slice(start, end);
}

const crosshairBurstCss = cssBlock(".crosshair-burst");
const cursorReturningCss = cssBlock(".space-cursor-dot--returning");
const cursorSyncingCss = cssBlock(".space-cursor-dot--syncing");

assert(!files.cursor.includes('"text"'), "custom cursor must not switch into text caret mode");
assert(!files.cursor.includes("isTextElement"), "custom cursor must not detect ordinary text as a cursor mode");
assert(files.cursor.includes("lastPointerPositionRef"), "custom cursor must track latest system pointer coordinates");
assert(
  !files.cursor.includes("if (returning || document.pointerLockElement) return;"),
  "custom cursor must keep tracking pointer movement during return/sync animation",
);
assert(files.cursor.includes("!pointerLocked || returning"), "cursor must remain visible during return animation after pointer lock");
assert(
  files.cursor.includes("setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 })"),
  "cursor return animation must target the viewport center",
);
assert(
  /if\s*\(\s*options\?\.target\s*===\s*"pointer"\s*\)\s*\{\s*setPos\s*\(\s*lastPointerPositionRef\.current\s*\);\s*\}\s*else\s*\{\s*setPos\s*\(\s*\{\s*x:\s*window\.innerWidth\s*\/\s*2,\s*y:\s*window\.innerHeight\s*\/\s*2\s*\}\s*\);\s*\}/.test(files.cursor),
  "cursor return animation must default to center while keeping pointer target as an explicit option",
);
assert(files.cursorController.includes("type CursorReturnOptions"), "cursor return controller must expose visual options");
assert(
  !files.cursorController.includes("onComplete"),
  "cursor return controller must no longer delay pointer lock through an animation completion callback",
);
assert(
  files.pointerLock.indexOf("requestSpacePointerLock();") <
    files.pointerLock.indexOf('requestSpaceCursorReturn({ target: "center" });'),
  "pointer lock must be requested before the cursor return visual animation",
);
assert(cursorReturningCss.includes("left 500ms") && cursorReturningCss.includes("top 500ms"), "returning cursor must animate left/top");
assert(cursorSyncingCss.includes("left 500ms") && cursorSyncingCss.includes("top 500ms"), "syncing cursor must animate left/top");

assert(crosshairBurstCss.includes("spaceCursorClickPulse"), "empty SPACE click pulse must reuse the cursor click pulse animation");
assert(files.player.includes("const WALK_SPEED = 3.25;"), "walk speed must be raised to 3.25");
assert(files.footsteps.includes("const SPRINT_SPEED = 5.1;"), "sprint speed and footstep pacing must be raised to 5.1");

assert(files.hoverHighlight.includes("restoreFrameRef"), "exhibit hover material restore should be deferred off the hot raycast path");
assert(files.hoverHighlight.includes("requestAnimationFrame"), "exhibit hover material restore should be scheduled with requestAnimationFrame");

assert(files.topbar.includes("isChangingLanguage"), "language toggle must guard against repeated async changes");
assert(files.topbar.includes("await i18n.changeLanguage(next)"), "language toggle must await i18n language changes");
assert(files.topbar.includes("document.documentElement.lang = next"), "language toggle must sync document language");

console.log("space interaction contract tests passed");
