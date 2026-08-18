import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { files } from "../helpers/spaceContractFixture.mjs";
import { projectPath, readProjectFile } from "../helpers/projectPaths.mjs";

const configPath = "apps/web/src/scenes/onboarding/spaceOnboardingConfig.ts";
const statePath = "apps/web/src/scenes/onboarding/spaceOnboardingState.ts";
const scenePath = "apps/web/src/scenes/onboarding/SpaceOnboarding.tsx";
const focusDemoPath = "apps/web/src/scenes/onboarding/SpaceOnboardingFocusDemo.tsx";
const visibilityPath = "apps/web/src/scenes/onboarding/spaceOnboardingSignVisibility.ts";

for (const file of [configPath, statePath, scenePath]) {
  assert.equal(existsSync(projectPath(file)), true, `${file} must exist`);
}
for (const file of [focusDemoPath, visibilityPath]) {
  assert.equal(existsSync(projectPath(file)), false, `${file} should be retired`);
}
assert.equal(existsSync(projectPath("apps/web/public/onboarding")), false);

const config = readProjectFile(configPath);
const state = readProjectFile(statePath);
const scene = readProjectFile(scenePath);
const desktop = files.desktop;
const spaceScene = files.spaceScene;
const exhibitRaycast = files.exhibitRaycast;
const css = files.css;
const dailyResume = readProjectFile("apps/web/src/space/spaceDailyResume.ts");
const sessionPose = readProjectFile("apps/web/src/space/spaceSessionPose.ts");
const desktopApp = readProjectFile("apps/web/src/app/DesktopApp.tsx");
const startLobby = readProjectFile("apps/web/src/lobby/StartLobby.tsx");

assert.match(config, /SpaceOnboardingStepId = "move" \| "look" \| "complete"/);
assert.match(config, /SPACE_ONBOARDING_MOVE_DISTANCE_M = 1\.4/);
assert.match(config, /SPACE_ONBOARDING_LOOK_RADIANS = \(7 \* Math\.PI\) \/ 180/);
assert.match(config, /keycaps: \["W", "A", "S", "D"\]/);
for (const retired of ["notice", "demo", "focus", "esc", "relock", "done", "tone", "hitSizeM"]) {
  assert.doesNotMatch(config, new RegExp(`\\b${retired}\\b`, "i"), `config must not contain ${retired}`);
}

assert.match(state, /type: "moveProgress"/);
assert.match(state, /type: "lookChanged"/);
assert.match(state, /step: "complete", completed: true/);
for (const retired of ["noticeViewed", "lookTargeted", "demoOpened", "demoClosed", "escUnlocked", "relocked", "doneViewed"]) {
  assert.doesNotMatch(state, new RegExp(retired), `state must not contain ${retired}`);
}

assert.match(scene, /import \{ Html \} from "@react-three\/drei"/);
assert.match(scene, /SPACE_ONBOARDING_SIGNS/);
assert.match(scene, /space-onboarding-sign__text/);
assert.match(scene, /space-onboarding-sign__keycap/);
assert.match(scene, /moveStartZRef/);
assert.match(scene, /lookStartQuaternionRef/);
assert.match(scene, /\.angleTo\(camera\.quaternion\)/);
assert.match(scene, /type: "moveProgress"/);
assert.match(scene, /type: "lookChanged"/);
assert.match(scene, /space-onboarding-sign--active/);
assert.match(scene, /space-onboarding-sign--exiting/);
for (const retired of ["Raycaster", "lookHitMeshRef", "demoHitMeshRef", "lookTargeted", "demoOpened", "pointerLocked", "focusDemoVisible", "updateSpaceOnboardingSignQueue"]) {
  assert.doesNotMatch(scene, new RegExp(retired), `scene must not contain ${retired}`);
}

assert.doesNotMatch(desktop, /SPACE_ONBOARDING_DEMO_EXHIBIT_ID|SpaceOnboardingFocusDemo/);
assert.doesNotMatch(desktop, /suppressNextExhibitClick|handleConsumeSuppressedClick/);
assert.doesNotMatch(spaceScene, /suppressNextClick|onConsumeSuppressedClick/);
assert.doesNotMatch(exhibitRaycast, /suppressNextClick|onConsumeSuppressedClick/);
assert.doesNotMatch(files.hud, /focusOpen/);
assert.doesNotMatch(files.cursor, /focusOpen/);
assert.doesNotMatch(readProjectFile("apps/web/src/media/PlaybackBar.tsx"), /elevated|playback-bar--focus-center/);
assert.doesNotMatch(css, /playback-bar--focus-center/);
assert.match(desktop, /const handleFocusExhibit/);
assert.match(desktop, /manifest === null/);
assert.doesNotMatch(spaceScene, /projectorInteractive=\{controlsEnabled && !onboardingEnabled\}/);
assert.match(spaceScene, /projectorInteractive=\{controlsEnabled\}/);

assert.match(css, /\.space-onboarding-sign--active/);
assert.match(css, /\.space-onboarding-sign--exiting/);
assert.doesNotMatch(css, /\.space-onboarding-focus/);
assert.doesNotMatch(css, /spaceOnboardingTextSwap|spaceOnboardingMistDissolve|spaceOnboardingFloat/);

assert.match(sessionPose, /clearSpaceSessionPose/);
assert.match(desktop, /clearSpaceSessionPose/);
assert.match(dailyResume, /shouldSaveSpaceDailyResume/);
assert.match(desktop, /dailyResumePose === null/);
assert.doesNotMatch(desktop, /setToast\(t\("space\.resume|setToast\("resume/);

assert.match(startLobby, /<StartLobbyBarrage/);
assert.match(startLobby, />\s*Enter\s*</);
assert.match(desktopApp, /start-lobby-handoff__cover/);
assert.match(desktopApp, /startLobbyExposureOut/);

console.log("space onboarding contract tests passed");
