import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { cssRule, declarationValue } from "../helpers/cssAssertions.mjs";

const sourceUrl = (relativePath) => new URL(`../../src/${relativePath}`, import.meta.url);
const readSource = (relativePath) => {
  const url = sourceUrl(relativePath);
  assert.equal(existsSync(url), true, `${relativePath} must exist`);
  return readFileSync(url, "utf8").replace(/\r\n/g, "\n");
};

test("StartLobby is a demand-rendered raw R3F canvas with one native Enter", () => {
  const source = readSource("lobby/StartLobby.tsx");

  assert.match(source, /createRoot\s*\(/);
  assert.match(source, /frameloop:\s*["']demand["']/);
  assert.match(source, /dpr:\s*\[?1(?:\.0)?,\s*1\.25\]?|dpr:\s*1\.25/);
  assert.match(source, /<canvas[\s\S]*aria-hidden=["']true["']/);
  assert.equal((source.match(/<button\b/g) ?? []).length, 1);
  assert.match(source, /<button[\s\S]*type=["']button["'][\s\S]*>\s*Enter\s*<\/button>/);
  assert.doesNotMatch(source, /<Canvas\b|useFrame\s*\(|requestAnimationFrame|setInterval\s*\(/);
});

test("raw R3F registers its exact Three JSX catalog and reuses a StrictMode-safe root owner", () => {
  const source = readSource("lobby/StartLobby.tsx");

  assert.match(source, /extend\s*\(\s*\{/);
  for (const constructor of [
    "AmbientLight",
    "BoxGeometry",
    "Color",
    "DirectionalLight",
    "Fog",
    "Group",
    "Mesh",
    "MeshToonMaterial",
  ]) {
    assert.match(source, new RegExp(`\\b${constructor}\\b`));
  }
  assert.doesNotMatch(source, /extend\s*\(\s*THREE\s*\)/);
  assert.match(source, /createStartLobbyRootOwner/);
  assert.match(source, /\.mount\s*\(\s*\)/);
  assert.match(source, /\.scheduleUnmount\s*\(\s*\)/);
});

test("StartLobby uses real extruded text and the approved restrained palette", () => {
  const source = readSource("lobby/StartLobby.tsx");
  const css = readSource("lobby/startLobby.css");
  const threeBackground = source.match(/<color\s+attach=["']background["']\s+args=\{\[["'](#[0-9a-f]{6})["']\]\}\s*\/>/i);
  const threeFog = source.match(/<fog\s+attach=["']fog["']\s+args=\{\[["'](#[0-9a-f]{6})["']/i);
  const lobbyRule = css.match(/\.start-lobby\s*\{([\s\S]*?)\}/);
  const cssBackground = lobbyRule?.[1].match(/\bbackground:\s*(#[0-9a-f]{6})\s*;/i);
  const geometryAccentColors = [
    ...source.matchAll(
      /<boxGeometry\b[^>]*\/>\s*<meshToonMaterial\s+color=["'](#[0-9a-f]{6})["']\s*\/>/gi,
    ),
  ].map(([, color]) => color.toLowerCase());

  assert.match(source, /TextGeometry/);
  assert.match(source, /FontLoader/);
  assert.match(source, /helvetiker_bold\.typeface\.json\?url/);
  assert.match(source, /LIZZARDKEVIN/);
  assert.match(source, /SPACE/);
  assert.match(source, /<LobbyWord text="LIZZARDKEVIN" size=\{0\.38\} y=\{0\.58\} \/>/);
  assert.match(source, /<LobbyWord text="SPACE" size=\{1\.24\} y=\{-0\.72\} \/>/);
  assert.deepEqual(
    [threeBackground?.[1], threeFog?.[1], cssBackground?.[1]],
    ["#69827e", "#69827e", "#69827e"],
    "Three background, Three fog, and CSS fallback must share the approved field color",
  );
  assert.deepEqual(
    geometryAccentColors,
    ["#4aa7a5", "#79cbc6", "#358d8e"],
    "the three block geometry accents must retain their approved colors",
  );
  for (const forbidden of ["@react-three/drei", "@react-three/rapier", ".glb", ".gltf", "postprocessing", "Howl"])
    assert.equal(source.includes(forbidden), false, `StartLobby must not contain ${forbidden}`);
});

test("StartLobby Enter is a text-only control with depth and glyph focus", () => {
  const css = readSource("lobby/startLobby.css");
  const enterRule = cssRule(css, ".start-lobby__enter");
  const focusRule = cssRule(css, ".start-lobby__enter:focus-visible");

  assert.equal(declarationValue(enterRule, "border"), "0");
  assert.equal(declarationValue(enterRule, "background"), "transparent");
  assert.doesNotMatch(enterRule, /\bmin-width\s*:/);
  assert.match(declarationValue(enterRule, "text-shadow"), /1px 1px 0.*2px 2px 0/);
  assert.match(css, /\.start-lobby__enter:focus-visible\s*\{\s*outline:\s*none;/);
  assert.match(declarationValue(focusRule, "text-shadow"), /0 0/);
});

test("StartLobby limits input work and becomes static for reduced motion", () => {
  const source = readSource("lobby/StartLobby.tsx");
  const handoff = readSource("lobby/startLobbyHandoff.ts");

  assert.match(source, /prefers-reduced-motion:\s*reduce/);
  assert.match(source, /\.invalidate\s*\(/);
  assert.match(source, /onPointerMove=/);
  assert.match(source, /onPointerDown=/);
  assert.doesNotMatch(source, /onClick=\{[^}]*canvas|onPointerMissed|easter|blankClick/i);
  assert.match(handoff, /MAX_START_LOBBY_TILT_DEGREES\s*=\s*6/);
});

test("StartLobby releases the R3F context through its callback without a forced timeout", () => {
  const source = readSource("lobby/StartLobby.tsx");

  assert.match(source, /unmountComponentAtNode\s*\([\s\S]*onReleased/);
  assert.doesNotMatch(source, /hadWebGLContext|finishWithoutContext/);
  assert.doesNotMatch(source, /setTimeout\s*\(/);
});

test("StartLobby observes its container and resizes the raw R3F store without a frame loop", () => {
  const source = readSource("lobby/StartLobby.tsx");
  const viewport = readSource("lobby/startLobbyViewport.ts");

  assert.match(source, /new ResizeObserver\s*\(/);
  assert.match(source, /\.observe\s*\(\s*container\s*\)/);
  assert.match(source, /syncStartLobbyViewport/);
  assert.match(viewport, /\.setSize\s*\(/);
  assert.match(viewport, /\.invalidate\s*\(/);
  assert.doesNotMatch(source + viewport, /requestAnimationFrame|setInterval\s*\(/);
});

test("route cleanup drops the old context immediately while handoff keeps the callback barrier", () => {
  const source = readSource("lobby/StartLobby.tsx");
  const owner = readSource("lobby/startLobbyRootOwner.ts");

  assert.match(source, /release\.kind\s*===\s*["']route-cleanup["']/);
  assert.match(source, /releaseStartLobbyRouteRenderer/);
  assert.match(owner, /kind:\s*["']handoff["']/);
  assert.match(owner, /onReleased/);
});

test("Focus viewer surfaces are resolved behind the entered gate", () => {
  const source = readSource("pages/SpaceDesktopExperience.tsx");

  assert.match(source, /resolveSpaceFocusSurfaceState\s*\(\s*\{/);
  assert.match(source, /entered,/);
  assert.match(source, /focusedRoutePending:/);
});

test("desktop starts boot and the persistent host only after lobby disposal", () => {
  const source = readSource("app/DesktopApp.tsx");
  const disposalHandler = source.match(
    /const\s+onLobbyDisposed\s*=\s*useCallback\([\s\S]*?\n\s*\);/,
  )?.[0] ?? "";

  assert.match(source, /lazy\(\(\)\s*=>\s*import\(["']\.\.\/pages\/SpacePage["']\)\)/);
  assert.match(source, /lazy\(\(\)\s*=>\s*import\(["']\.\.\/space\/SpaceHost["']\)\)/);
  assert.match(disposalHandler, /boot\.start\s*\(\)/);
  assert.match(disposalHandler, /setSpaceStarted\s*\(true\)/);
  assert.doesNotMatch(source, /useEntryTransition|EntryTransition|EntrySplash/);
  assert.doesNotMatch(source, /setTimeout\s*\(/);
});

test("desktop handoff keeps failure and retry controls above the opaque cover", () => {
  const source = readSource("app/DesktopApp.tsx");
  const css = readSource("lobby/startLobby.css");

  assert.match(source, /start-lobby-handoff__cover/);
  assert.match(source, /boot\.state\.phase\s*===\s*["']failed["']/);
  assert.match(source, /boot\.retry\s*\(\)/);
  assert.match(css, /start-lobby-handoff__cover[\s\S]*background:/);
  assert.match(css, /start-lobby-handoff__failure/);
});

test("the main runtime no longer depends on the legacy entry transition", () => {
  const host = readSource("space/SpaceHost.tsx");
  const experience = readSource("pages/SpaceDesktopExperience.tsx");
  const canvasHost = readSource("space/SpaceCanvasHost.tsx");

  for (const source of [host, experience, canvasHost]) {
    assert.doesNotMatch(source, /EntryTransition|entryIsFading|entry\.showSplash/);
  }
  assert.equal(existsSync(sourceUrl("components/entry/EntrySplash.tsx")), false);
  assert.equal(existsSync(sourceUrl("hooks/useEntryTransition.ts")), false);
  assert.equal(existsSync(sourceUrl("entry/entryTypes.ts")), false);
  assert.equal(existsSync(sourceUrl("entry/entryTransitionState.ts")), false);
});
