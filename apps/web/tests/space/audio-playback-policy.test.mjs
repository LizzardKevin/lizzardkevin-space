import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import {
  canStartAsyncAudio,
  createAudioPlaybackPolicy,
  effectiveProceduralAmbientGain,
  effectiveLoopVolume,
  resolveAmbientLoadErrorAction,
  setLoopDucked,
  setRoutePaused,
} from "../../src/audio/audioPlaybackPolicy.ts";
import { readSourceFile } from "../helpers/projectPaths.mjs";

const playbackBarSource = readSourceFile("media/PlaybackBar.tsx");

async function importPlaybackKeyboardPolicy() {
  const sourceFile = ts.createSourceFile(
    "PlaybackBar.tsx",
    playbackBarSource,
    ts.ScriptTarget.ESNext,
    true,
    ts.ScriptKind.TSX,
  );
  const declarations = sourceFile.statements.filter(
    (statement) =>
      (ts.isFunctionDeclaration(statement) && statement.name?.text === "resolvePlaybackKeyboardSeek") ||
      (ts.isVariableStatement(statement) &&
        statement.declarationList.declarations.some(
          (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === "PLAYBACK_KEYBOARD_STEP_SECONDS",
        )),
  );

  assert.equal(declarations.length, 2, "PlaybackBar must export its keyboard seek policy and documented step");

  const isolatedSource = `${declarations.map((declaration) => declaration.getText(sourceFile)).join("\n")}
export { PLAYBACK_KEYBOARD_STEP_SECONDS, resolvePlaybackKeyboardSeek };`;
  const javascript = ts.transpileModule(isolatedSource, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2023,
    },
  }).outputText;
  const encoded = Buffer.from(javascript).toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

test("route resume restores the effective ducked channel targets", () => {
  let policy = createAudioPlaybackPolicy();
  policy = setLoopDucked(policy, "bgm", true);
  policy = setLoopDucked(policy, "ambient", true);
  policy = setRoutePaused(policy, true);
  policy = setRoutePaused(policy, false);

  assert.equal(effectiveLoopVolume(policy, "bgm", 0.6), 0.27);
  assert.equal(effectiveLoopVolume(policy, "ambient", 0.6), 0.21);
});

test("async play and fallback paths remain blocked while a route is paused", () => {
  const paused = setRoutePaused(createAudioPlaybackPolicy(), true);
  assert.equal(canStartAsyncAudio(paused), false);
  assert.equal(resolveAmbientLoadErrorAction(paused, true), "defer-fallback");
  assert.equal(resolveAmbientLoadErrorAction(paused, false), "ignore");
  assert.equal(canStartAsyncAudio(setRoutePaused(paused, false)), true);
});

test("procedural ambient fallback preserves master volume and ambient ducking", () => {
  const ducked = setLoopDucked(createAudioPlaybackPolicy(), "ambient", true);
  assert.equal(effectiveProceduralAmbientGain(ducked, 0.9, 0.6), 0.189);
  assert.equal(resolveAmbientLoadErrorAction(ducked, true), "start-fallback");
});

test("playback slider is keyboard reachable and wires handled keys to the shared seek owner", () => {
  assert.match(playbackBarSource, /role="slider"/);
  assert.match(playbackBarSource, /tabIndex=\{0\}/);
  assert.match(playbackBarSource, /onKeyDown=\{[^}]*handlePlaybackKeyDown[^}]*\}/);
  assert.match(playbackBarSource, /if \(nextTime === null\) return;/);
  assert.match(playbackBarSource, /event\.preventDefault\(\);[\s\S]*seekTo\(nextTime\);/);
});

test("playback keyboard seek policy maps slider keys, clamps values, and ignores unrelated keys", async () => {
  const { PLAYBACK_KEYBOARD_STEP_SECONDS, resolvePlaybackKeyboardSeek } = await importPlaybackKeyboardPolicy();

  assert.equal(PLAYBACK_KEYBOARD_STEP_SECONDS, 5);
  assert.equal(resolvePlaybackKeyboardSeek("ArrowLeft", 12, 20), 7);
  assert.equal(resolvePlaybackKeyboardSeek("ArrowDown", 12, 20), 7);
  assert.equal(resolvePlaybackKeyboardSeek("ArrowRight", 12, 20), 17);
  assert.equal(resolvePlaybackKeyboardSeek("ArrowUp", 12, 20), 17);
  assert.equal(resolvePlaybackKeyboardSeek("Home", 12, 20), 0);
  assert.equal(resolvePlaybackKeyboardSeek("End", 12, 20), 20);
  assert.equal(resolvePlaybackKeyboardSeek("ArrowLeft", 2, 20), 0);
  assert.equal(resolvePlaybackKeyboardSeek("ArrowRight", 18, 20), 20);
  assert.equal(resolvePlaybackKeyboardSeek("ArrowRight", Number.NaN, 20), 5);
  assert.equal(resolvePlaybackKeyboardSeek("End", 12, Number.POSITIVE_INFINITY), 0);
  assert.equal(resolvePlaybackKeyboardSeek("PageUp", 12, 20), null);
});
