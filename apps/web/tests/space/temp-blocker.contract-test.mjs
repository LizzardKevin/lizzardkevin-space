import assert from "node:assert/strict";
import { files } from "../helpers/spaceContractFixture.mjs";
import { readProjectFile } from "../helpers/projectPaths.mjs";

const notices = readProjectFile("apps/web/src/scenes/gallery/TempBlockerNotices.tsx");
const i18n = readProjectFile("apps/web/src/i18n/i18n.ts");

assert(
  files.galleryModel.includes("TempBlockerNotices") &&
    files.galleryModel.includes("<TempBlockerNotices root={gltf.scene} />"),
  "GalleryModel must mount TEMP blocker notices on the loaded space_main scene",
);
assert(
  notices.includes("TEMP_BLOCKER_NOTICE_DISTANCE_M = 10"),
  "TEMP blocker notice should appear within 10 meters",
);
assert(
  notices.includes("isTempBlockerMeshName") && notices.includes("collectTempBlockerNoticeSpecs"),
  "TEMP blocker notices should scan the authored TEMP_BLOCKER_* meshes",
);
assert(
  notices.includes("distanceToPoint(camera.position)") && notices.includes("useFrame"),
  "TEMP blocker visibility should be driven by camera distance to the corresponding blocker surface",
);
assert(
  notices.includes('style={{ pointerEvents: "none", userSelect: "none" }}'),
  "TEMP blocker notices must not steal pointer lock or raycast clicks",
);
assert(!notices.includes("Collider"), "TEMP blocker notices must not create physics colliders");
assert(
  i18n.includes('tempBlocker:') &&
    i18n.includes('notice: "后方空间仍在建设中"') &&
    i18n.includes('notice: "More SPACE is under construction"'),
  "TEMP blocker notice copy must exist in Chinese and English",
);
assert(
  files.css.includes(".space-temp-blocker-notice") &&
    files.css.includes(".space-temp-blocker-notice--active") &&
    files.css.includes("pointer-events: none"),
  "TEMP blocker notice CSS must keep the text subtle and non-interactive",
);

console.log("space TEMP blocker contract tests passed");
