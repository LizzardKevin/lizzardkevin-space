import assert from "node:assert/strict";
import { readProjectFile } from "../helpers/projectPaths.mjs";

const projector = readProjectFile("apps/web/src/scenes/projector/SpaceProjectorInstallation.tsx");
const slides = readProjectFile("apps/web/src/scenes/projector/projectorSlides.ts");
const directory = readProjectFile("apps/web/src/scenes/projector/projectorImageDirectory.ts");
const spaceScene = readProjectFile("apps/web/src/scenes/SpaceScene.tsx");
const galleryModel = readProjectFile("apps/web/src/scenes/gallery/GalleryModel.tsx");

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
    projector.includes("screen.userData.exhibitMaxDistance = PROJECTOR_INTERACTION_DISTANCE"),
  "projector screen mesh must expose the current slide as the clickable exhibit target",
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
    projector.includes("PROJECTOR_FLICKER_STRENGTH") &&
    projector.includes("PROJECTOR_WALL_SCANLINES"),
  "wall projection must render WebGPU-compatible image, scanline, and flicker materials",
);
assert(
  slides.includes("PROJECTOR_IMAGE_DIRECTORY") &&
    slides.includes("buildProjectorSelectionImageUrl") &&
    directory.includes("PROJECTOR_IMAGE_DIRECTORY_WORKSPACE_PATH") &&
    directory.includes("imageFiles"),
  "wall projection slides must come from the curated image directory",
);
assert(
  slides.includes("PROJECTOR_SLIDE_DURATION_MS = 8000"),
  "projector slideshow should use a slow exhibition cadence",
);
assert(
  slides.includes("PROJECTOR_CROSSFADE_MS = 750"),
  "projector slideshow should crossfade without fast cutting",
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
