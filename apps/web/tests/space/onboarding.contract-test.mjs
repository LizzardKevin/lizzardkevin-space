import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { files } from "../helpers/spaceContractFixture.mjs";
import { projectPath, readProjectFile } from "../helpers/projectPaths.mjs";

const expectedFiles = {
  config: "apps/web/src/scenes/onboarding/spaceOnboardingConfig.ts",
  state: "apps/web/src/scenes/onboarding/spaceOnboardingState.ts",
  visibility: "apps/web/src/scenes/onboarding/spaceOnboardingSignVisibility.ts",
  scene: "apps/web/src/scenes/onboarding/SpaceOnboarding.tsx",
  focusDemo: "apps/web/src/scenes/onboarding/SpaceOnboardingFocusDemo.tsx",
};

const removedFiles = {
  fogState: "apps/web/src/scenes/onboarding/spaceOnboardingFogState.ts",
  fogBlocker: "apps/web/src/scenes/onboarding/SpaceOnboardingFogBlocker.tsx",
  fogTest: "apps/web/tests/space/onboarding-fog.test.mjs",
};

for (const file of Object.values(expectedFiles)) {
  assert.ok(existsSync(projectPath(file)), `${file} must exist`);
}

for (const file of Object.values(removedFiles)) {
  assert.equal(existsSync(projectPath(file)), false, `${file} should be removed`);
}

const config = readProjectFile(expectedFiles.config);
const visibility = readProjectFile(expectedFiles.visibility);
const onboardingScene = readProjectFile(expectedFiles.scene);
const focusDemo = readProjectFile(expectedFiles.focusDemo);
const desktop = files.desktop;
const focusOverlay = readProjectFile("apps/web/src/exhibits/FocusOverlay.tsx");
const i18n = readProjectFile("apps/web/src/i18n/i18n.ts");
const css = files.css;
const packageJson = readProjectFile("package.json");

const expectedAssetPaths = [
  "apps/web/public/onboarding/space-onboarding-move.png",
  "apps/web/public/onboarding/space-onboarding-look.png",
  "apps/web/public/onboarding/space-onboarding-demo.png",
  "apps/web/public/onboarding/space-onboarding-esc.png",
  "apps/web/public/onboarding/space-onboarding-relock.png",
  "apps/web/public/onboarding/space-onboarding-done.png",
];

function readPngDimensions(assetPath) {
  const bytes = readFileSync(projectPath(assetPath));
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

for (const assetPath of expectedAssetPaths) {
  const absolutePath = projectPath(assetPath);
  assert.ok(existsSync(absolutePath), `${assetPath} must exist`);
  assert.ok(statSync(absolutePath).size > 1024, `${assetPath} should contain a real PNG asset`);
  const dimensions = readPngDimensions(assetPath);
  assert.ok(dimensions.height >= 280, `${assetPath} should include a taller transparent canvas for dissolve blur`);
  assert.ok(dimensions.width >= 860, `${assetPath} should include wide transparent padding for glow and dissolve blur`);
}

assert.match(
  config,
  /SPACE_ONBOARDING_DEMO_EXHIBIT_ID\s*=\s*"space_onboarding_demo"/,
  "onboarding demo should use a stable synthetic exhibit id",
);
assert.match(
  config,
  /SPACE_ONBOARDING_DEMO_HIT_POSITION/,
  "demo hit mesh should have an explicit position aligned to the glowing text",
);
assert.match(
  config,
  /SPACE_ONBOARDING_DEMO_HIT_SIZE:\s*\[number,\s*number,\s*number\]\s*=\s*\[\s*SPACE_ONBOARDING_SIGNS\.demo\.hitSizeM\[0\],\s*SPACE_ONBOARDING_SIGNS\.demo\.hitSizeM\[1\],\s*0\.12,\s*\]/,
  "demo hit mesh should derive from the configured text hit area",
);
assert.match(
  config,
  /SPACE_ONBOARDING_LOOK_HIT_ID\s*=\s*"space_onboarding_look_target"/,
  "look target practice should have a stable internal raycast id",
);
assert.match(
  config,
  /imageSrc:\s*"\/onboarding\/space-onboarding-look\.png"/,
  "look sign should use a generated onboarding PNG",
);
assert.match(
  config,
  /hitSizeM:\s*\[2\.75,\s*0\.68\]/,
  "look sign should expose a tight hit area around the text PNG",
);
assert.match(
  config,
  /SPACE_ONBOARDING_EYE_LEVEL_Y/,
  "onboarding signs should share a derived eye-level height",
);
assert.match(
  config,
  /position:\s*\[-0\.55,\s*SPACE_ONBOARDING_EYE_LEVEL_Y,\s*-46\.7\]/,
  "move sign should sit in front of spawn",
);
assert.match(
  config,
  /position:\s*\[-2\.55,\s*SPACE_ONBOARDING_EYE_LEVEL_Y,\s*-41\.8\]/,
  "look sign should sit farther down the left wall",
);
assert.match(
  config,
  /position:\s*\[-0\.55,\s*SPACE_ONBOARDING_EYE_LEVEL_Y,\s*-39\.6\]/,
  "demo sign should sit in the corridor center",
);
assert.match(
  config,
  /position:\s*\[1\.85,\s*SPACE_ONBOARDING_EYE_LEVEL_Y,\s*-35\.8\]/,
  "Esc sign should appear on the right side later",
);
assert.match(
  config,
  /position:\s*\[-0\.55,\s*SPACE_ONBOARDING_EYE_LEVEL_Y,\s*-33\.6\]/,
  "done sign should sit ahead of the Esc lesson",
);

assert(onboardingScene.includes("Html"), "onboarding signs should use drei Html");
assert(onboardingScene.includes("transform"), "onboarding signs should be bound to world coordinates");
assert(onboardingScene.includes("sprite"), "onboarding signs should face the camera");
assert(onboardingScene.includes("space-onboarding-sign__image"), "onboarding signs should render PNG text assets");
assert(onboardingScene.includes("aria-label={t(sign.textKey)}"), "PNG signs should keep translated accessible labels");
assert(
  !onboardingScene.includes("{t(sign.textKey)}</div>"),
  "onboarding world signs should not render live text after PNG asset integration",
);
assert(
  onboardingScene.includes("updateSpaceOnboardingSignQueue") &&
    onboardingScene.includes("space-onboarding-sign--exiting"),
  "onboarding signs should linger and dissolve instead of unmounting instantly",
);
assert(
  onboardingScene.includes("lookHitMeshRef") &&
    onboardingScene.includes("raycaster.intersectObject") &&
    onboardingScene.includes("lookTargeted"),
  "look tutorial should complete when the crosshair raycast hits the look text",
);
assert(
  visibility.includes("SPACE_ONBOARDING_SIGN_NEXT_DELAY_MS") &&
    visibility.includes("SPACE_ONBOARDING_SIGN_DISSOLVE_MS"),
  "onboarding sign visibility should define the short inter-sign delay and dissolve timing",
);
assert(
  visibility.includes("SPACE_ONBOARDING_SIGN_NEXT_DELAY_MS = 250"),
  "onboarding signs should wait 250ms between a dissolved sign and the next sign",
);
assert(
  visibility.includes("SPACE_ONBOARDING_SIGN_ENTER_MS") &&
    visibility.includes("SPACE_ONBOARDING_SIGN_DISSOLVE_LEAD_M") &&
    visibility.includes("createInitialSpaceOnboardingSignQueueState") &&
    visibility.includes("swapEscToRelock"),
  "onboarding sign visibility should define enter timing, lead-distance dissolve, queued signs, and Esc/relock swap behavior",
);
assert(
  onboardingScene.includes("SPACE_ONBOARDING_DEMO_EXHIBIT_ID") &&
    onboardingScene.includes("SPACE_ONBOARDING_DEMO_HIT_POSITION") &&
    onboardingScene.includes("userData={demoHitUserData}"),
  "demo sign should expose the synthetic exhibit id through a raycast hit mesh",
);
assert(
  !onboardingScene.includes("SpaceOnboardingFogBlocker") &&
    !onboardingScene.includes("spaceOnboardingFogState") &&
    !onboardingScene.includes("Fog"),
  "onboarding scene should not import or render the removed fog blocker",
);
assert(
  !packageJson.includes("onboarding-fog.test.mjs"),
  "unit test script should not reference removed fog tests",
);

const handleFocusIndex = desktop.indexOf("const handleFocusExhibit");
const demoInterceptIndex = desktop.indexOf("id === SPACE_ONBOARDING_DEMO_EXHIBIT_ID", handleFocusIndex);
const manifestLookupIndex = desktop.indexOf("manifest === null", handleFocusIndex);
assert(handleFocusIndex >= 0, "desktop experience should define handleFocusExhibit");
assert(demoInterceptIndex >= 0, "desktop experience should branch on the onboarding demo id");
assert(manifestLookupIndex >= 0, "desktop experience should still guard real exhibit manifest loading");
assert(
  demoInterceptIndex < manifestLookupIndex,
  "desktop experience should intercept the onboarding demo before manifest lookup",
);
assert(desktop.includes("SpaceOnboardingFocusDemo"), "desktop experience should render the onboarding focus demo");

assert(focusDemo.includes("useFocusDoubleClickHandler"), "demo focus should support double-click blank exit");
assert(focusDemo.includes("focus-return-button"), "demo focus should reuse the return-to-space button language");
assert(focusDemo.includes("space-onboarding-focus__exitHint"), "demo focus should teach double-click exit locally");
assert(!focusDemo.includes("space-onboarding-sign__image"), "demo focus should keep the original DOM typography");
assert(!focusOverlay.includes("space-onboarding-focus__exitHint"), "real exhibit focus must not show onboarding exit hint");
assert(!focusOverlay.includes("双击空白也可以退出"), "real exhibit focus must not gain the onboarding double-click copy");

assert(i18n.includes("onboarding"), "i18n should contain onboarding copy");
assert(i18n.includes('esc: "按 Esc 呼出鼠标"'), "Chinese Esc copy should only teach releasing the mouse");
assert(
  i18n.includes('relock: "点击空白区域重新控制视角"'),
  "Chinese relock copy should teach clicking blank space to regain view control",
);
assert(
  i18n.includes('focusExit: "双击空白，或点击顶部 space 回到 SPACE"'),
  "Chinese demo focus exit copy should teach the focus return affordances",
);
assert(
  i18n.includes('focusBody: "你将能够了解作品背后的故事"'),
  "Chinese demo focus body should match the requested story-oriented copy",
);
assert(
  i18n.includes('look: "移动鼠标环顾，对准我"'),
  "Chinese look onboarding copy should ask visitors to aim at the sign",
);
assert(
  i18n.includes('done: "顺着道路前往SPACE吧"'),
  "Chinese final onboarding copy should invite the visitor toward SPACE",
);
assert(i18n.includes('esc: "Press Esc to release the mouse"'), "English Esc copy should only teach release");
assert(
  i18n.includes('relock: "Click an empty area to control the view again"'),
  "English relock copy should teach clicking blank space",
);
assert(css.includes(".space-onboarding-sign"), "global CSS should style world onboarding signs");
assert(css.includes(".space-onboarding-sign__image"), "global CSS should style generated onboarding PNGs");
assert(css.includes("drop-shadow"), "generated onboarding PNGs should receive runtime glow");
assert(css.includes("spaceOnboardingTextEnter"), "global CSS should fade onboarding text in");
assert(css.includes("spaceOnboardingTextSwap"), "global CSS should animate Esc/relock text conversion");
assert(css.includes(".space-onboarding-sign--exiting"), "global CSS should animate onboarding sign exits");
assert(css.includes("spaceOnboardingDissolve"), "global CSS should dissolve completed onboarding signs");
assert(css.includes("spaceOnboardingMistDissolve"), "global CSS should dissolve text through a soft mist layer");
assert(css.includes("cubic-bezier(0.16, 1, 0.3, 1)"), "dissolve animation should use a smooth non-choppy easing");
assert(css.includes(".space-onboarding-focus"), "global CSS should style the demo focus overlay");

console.log("space onboarding contract tests passed");
