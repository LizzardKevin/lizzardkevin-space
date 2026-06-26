import { cssBlock } from "./cssAssertions.mjs";
import { readOptionalProjectFile, readProjectFile } from "./projectPaths.mjs";

export const files = {
  cursor: readProjectFile("apps/web/src/cursor/SpaceCursorOverlay.tsx"),
  cursorController: readProjectFile("apps/web/src/cursor/spaceCursorController.ts"),
  crosshair: readProjectFile("apps/web/src/components/Crosshair.tsx"),
  css: readProjectFile("apps/web/src/styles/global.css"),
  debugOverlay: readOptionalProjectFile("apps/web/src/scenes/debug/SpaceMovementDebugOverlay.tsx"),
  debugTelemetry: readOptionalProjectFile("apps/web/src/scenes/debug/spaceMovementDebug.ts"),
  guardedPointerLock: readProjectFile("apps/web/src/scenes/controls/guardedPointerLock.ts"),
  guardedPointerLockControls: readProjectFile("apps/web/src/scenes/controls/GuardedPointerLockControls.tsx"),
  hoverHighlight: readProjectFile("apps/web/src/exhibits/ExhibitHoverHighlight.tsx"),
  exhibitRaycast: readProjectFile("apps/web/src/scenes/exhibits/ExhibitRaycast.tsx"),
  keyboard: readProjectFile("apps/web/src/scenes/controls/useKeyboard.tsx"),
  player: readProjectFile("apps/web/src/scenes/Player/PlayerController.tsx"),
  pointerLockFailure: readProjectFile("apps/web/src/space/pointerLockFailure.ts"),
  pointerLock: readProjectFile("apps/web/src/space/requestSpacePointerLock.ts"),
  spaceScene: readProjectFile("apps/web/src/scenes/SpaceScene.tsx"),
  footsteps: readProjectFile("apps/web/src/scenes/Player/useFootsteps.ts"),
  desktop: readProjectFile("apps/web/src/pages/SpaceDesktopExperience.tsx"),
  colColliders: readProjectFile("apps/web/src/scenes/collision/colColliders.tsx"),
  floorCollider: readProjectFile("apps/web/src/scenes/gallery/GalleryFloorCollider.tsx"),
  safetyGround: readProjectFile("apps/web/src/scenes/gallery/SafetyGround.tsx"),
  materialScript: readProjectFile("scripts/apply-space-main-materials.py"),
  aoScript: readProjectFile("scripts/bake-space-main-ao.py"),
  topbar: readProjectFile("apps/web/src/components/TopBar.tsx"),
};

export function spaceCssBlock(selector) {
  return cssBlock(files.css, selector);
}
