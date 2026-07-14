import assert from "node:assert/strict";
import { readSourceFile } from "../helpers/projectPaths.mjs";

const overlay = readSourceFile("exhibits/FocusOverlay.tsx");
const i18n = readSourceFile("i18n/i18n.ts");
const prefetch = readSourceFile("desktop/lightweightRoutePrefetch.ts");

assert.match(overlay, /selectedWorkMediaController\.select\(/);
assert.match(overlay, /return\s*\(\)\s*=>\s*session\.cancel\(\)/);
assert.doesNotMatch(overlay, /preloadFocusImages|focusImagePreload/);
assert.match(overlay, /preload=["']metadata["']/);
assert.match(overlay, /className=["']focus-media-progress["'][\s\S]*?role=["']status["'][\s\S]*?aria-live=["']polite["']/);
assert.match(overlay, /focus\.mediaLoadProgress/);
assert.match(overlay, /focus\.mediaLoadFailed/);
assert.match(i18n, /mediaLoadProgress/);
assert.match(i18n, /mediaLoadFailed/);
assert.doesNotMatch(prefetch, /selectedWorkMedia|FocusOverlay|focusImagePreload/);

console.log("selected work media integration contract tests passed");
