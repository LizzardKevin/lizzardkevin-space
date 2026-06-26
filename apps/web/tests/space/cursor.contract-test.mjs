import assert from "node:assert/strict";
import { files, spaceCssBlock } from "../helpers/spaceContractFixture.mjs";

const crosshairBurstCss = spaceCssBlock(".crosshair-burst");
const cursorDotCss = spaceCssBlock(".space-cursor-dot");
const cursorDragCss = spaceCssBlock(".space-cursor-dot--dragReady,\n.space-cursor-dot--dragging");
const cursorReturningCss = spaceCssBlock(".space-cursor-dot--returning");
const cursorSyncingCss = spaceCssBlock(".space-cursor-dot--syncing");

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
assert(files.cursor.includes("space-cursor-halo"), "custom cursor must render the subtle halo element");
assert(cursorDotCss.includes("clip-path: circle(50% at 50% 50%)"), "default cursor must keep a stable dot clip-path");
assert(cursorDotCss.includes("clip-path 120ms ease"), "cursor shape transitions must be short to avoid drag-to-dot flashing");
assert(cursorDragCss.includes("width: 14px") && cursorDragCss.includes("height: 14px"), "drag cursor should avoid an oversized grab shape");
assert(
  cursorDragCss.includes("clip-path: circle(50% at 50% 50%)"),
  "drag cursor should keep the same circular shape family to avoid grab-to-dot flashing",
);

assert(crosshairBurstCss.includes("spaceCursorClickPulse"), "empty SPACE click pulse must reuse the cursor click pulse animation");

console.log("space cursor contract tests passed");
