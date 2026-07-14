import assert from "node:assert/strict";
import { readSourceFile } from "../helpers/projectPaths.mjs";

const overlay = readSourceFile("exhibits/FocusOverlay.tsx");
const i18n = readSourceFile("i18n/i18n.ts");
const prefetch = readSourceFile("desktop/lightweightRoutePrefetch.ts");

assert.match(overlay, /selectedWorkMediaController\.select\(/);
assert.match(overlay, /return\s*\(\)\s*=>\s*\{[\s\S]*?session\.cancel\(\)/);
assert.doesNotMatch(overlay, /preloadFocusImages|focusImagePreload/);
assert.match(overlay, /preload=["']metadata["']/);
assert.match(overlay, /onLoadedMetadata=\{handleVideoMetadataLoaded\}/);
assert.match(overlay, /onError=\{handleVideoMetadataFailed\}/);
assert.match(overlay, /videoMetadataEventBridge\.record\(/);
assert.match(overlay, /outcome:\s*["']loaded["']/);
assert.match(overlay, /outcome:\s*["']failed["']/);
assert.match(overlay, /videoMetadataEventBridge\.bind\(/);
assert.match(overlay, /readyState:\s*videoElement\?\.readyState/);
assert.match(overlay, /error:\s*videoElement\?\.error/);
assert.match(overlay, /selectedMediaSessionRef\.current\?\.cancel\(\);[\s\S]*?setSelectedVideoMetadataSnapshot\(null\)/);
assert.equal((overlay.match(/className=["']focus-media-status-stack["']/g) ?? []).length, 1);
assert.match(overlay, /className=["']focus-media-status-stack["'][\s\S]*?role=["']status["'][\s\S]*?aria-live=["']polite["']/);
assert.match(overlay, /focus-media-status-stack[\s\S]*?focus\.mediaLoadFailed[\s\S]*?focus\.videoMetadataFailed/);
assert.doesNotMatch(overlay, /focus-media-status-stack[\s\S]*?role=["']alert["']/);
assert.equal((overlay.match(/aria-live=/g) ?? []).length, 1, "Focus media status uses one live region");
assert.match(overlay, /focus\.mediaLoadProgress/);
assert.match(overlay, /focus\.mediaLoadFailed/);
assert.match(i18n, /mediaLoadProgress/);
assert.match(i18n, /mediaLoadFailed/);
assert.doesNotMatch(prefetch, /selectedWorkMedia|FocusOverlay|focusImagePreload/);

const css = readSourceFile("styles/global.css");
assert.match(css, /\.focus-media-status-stack\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?gap:/);
assert.doesNotMatch(css, /\.focus-media-status-row\s*\{[^}]*position:\s*absolute/s);
assert.doesNotMatch(css, /\.focus-video-metadata-error\s*\{[^}]*position:\s*absolute/s);

console.log("selected work media integration contract tests passed");
