import assert from "node:assert/strict";
import { readProjectFile } from "../helpers/projectPaths.mjs";

const projector = readProjectFile("apps/web/src/scenes/projector/SpaceProjectorInstallation.tsx");
const slides = readProjectFile("apps/web/src/scenes/projector/projectorSlides.ts");
const slideshowHook = readProjectFile("apps/web/src/scenes/projector/useProjectorSlideshow.ts");
const directory = readProjectFile("apps/web/src/scenes/projector/projectorImageDirectory.ts");
const desktop = readProjectFile("apps/web/src/pages/SpaceDesktopExperience.tsx");
const spaceScene = readProjectFile("apps/web/src/scenes/SpaceScene.tsx");
const galleryModel = readProjectFile("apps/web/src/scenes/gallery/GalleryModel.tsx");
const packageJson = readProjectFile("package.json");

assert(
  projector.includes("EXHIBITS_Projector_001"),
  "wall projection must target the existing GLB screen mesh",
);
assert(
  !projector.includes("ProjectorBody") &&
    !projector.includes("ProjectorBeam") &&
    !projector.includes("cylinderGeometry") &&
    !projector.includes("AdditiveBlending"),
  "wall projection must not create projector body or light-beam meshes",
);
assert(
  projector.includes("screen.userData.exhibitId = slide.exhibitId") &&
    projector.includes("screen.userData.exhibitMaxDistance = PROJECTOR_INTERACTION_DISTANCE") &&
    projector.includes("screen.userData.disableExhibitHoverHighlight = true") &&
    projector.includes('screen.userData.interactionKind = "projector"'),
  "projector screen mesh must expose the current slide as a non-highlighted projector target",
);
assert(
  projector.includes("PROJECTOR_INTERACTION_DISTANCE = 25"),
  "projector screen hit distance must stay capped at 25 meters",
);
assert(
  projector.includes("depthTest") && projector.includes("depthWrite={false}"),
  "projected image must respect scene depth while avoiding transparent depth writes",
);
assert(
  projector.includes("box.min.z - PROJECTOR_SCREEN_FRONT_OFFSET"),
  "projected image plane must sit on the audience-facing side of the screen mesh",
);
assert(
  !projector.includes("onClick") && !projector.includes("onPointerDown"),
  "wall projection must not expose direct playback controls",
);
assert(
  !projector.includes("shaderMaterial") &&
    projector.includes("meshBasicMaterial") &&
    projector.includes("CanvasTexture") &&
    projector.includes("PROJECTOR_SCANLINE_OPACITY") &&
    projector.includes("PROJECTOR_WALL_SCANLINES"),
  "wall projection must render WebGPU-compatible image and scanline materials",
);
assert(
  slides.includes("PROJECTOR_IMAGE_DIRECTORY") &&
    slides.includes("buildProjectorSelectionImageUrl") &&
    directory.includes("PROJECTOR_IMAGE_DIRECTORY_WORKSPACE_PATH") &&
    directory.includes("imageFiles") &&
    directory.includes("optimized/") &&
    !directory.includes('".jpg"'),
  "wall projection slides must come from optimized curated images",
);
assert(
  !slides.includes("PROJECTOR_SLIDE_DURATION_MS") &&
    !slides.includes("PROJECTOR_REDUCED_MOTION_SLIDE_DURATION_MS") &&
    !projector.includes("useFrame("),
  "projector must stay static unless the visitor requests a manual slide change",
);
assert(
  !slides.includes("PROJECTOR_CROSSFADE_MS") &&
    !projector.includes("previousSlide") &&
    !projector.includes("previousMaterial"),
  "manual projector slide changes must not keep crossfade or previous-slide layers",
);
assert(
  slideshowHook.includes("lastHandledCommandNonceRef") &&
    slideshowHook.includes("useRef(command?.nonce ?? 0)") &&
    slideshowHook.includes("lastHandledCommandNonceRef.current = command.nonce"),
  "projector slide commands must be one-shot and must not replay on projector remount",
);
assert(
  desktop.includes("ProjectorControlsHint") &&
    desktop.includes('event.code === "KeyE"') &&
    desktop.includes('event.code === "KeyQ"') &&
    desktop.includes('exhibitTarget?.interactionKind === "projector"') &&
    desktop.includes("setProjectorSlideCommand"),
  "desktop SPACE must show the projector Q/E hint and forward manual slide commands only while aiming at the projector",
);
assert(
  packageJson.includes('"projector:optimize"') &&
    readProjectFile("scripts/optimize-projector-selection-images.mjs").includes("ffmpeg-static") &&
    readProjectFile("scripts/optimize-projector-selection-images.mjs").includes("optimized"),
  "projector image optimization must be available through the ffmpeg-static script",
);
assert(
  spaceScene.includes("projectorExhibits"),
  "SPACE scene must receive projector exhibit data from the desktop manifest",
);
assert(
  galleryModel.includes("SpaceProjectorInstallation"),
  "Gallery model must mount the projector installation near the loaded GLB root",
);

console.log("space projector contract tests passed");
