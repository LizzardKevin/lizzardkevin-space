import assert from "node:assert/strict";
import { readProjectFile } from "../helpers/projectPaths.mjs";
import "../space/visual-system.contract-test.mjs";

const desktop = readProjectFile("apps/web/src/pages/SpaceDesktopExperience.tsx");
const canvasHost = readProjectFile("apps/web/src/space/SpaceCanvasHost.tsx");
const canvasStatus = readProjectFile("apps/web/src/space/spaceCanvasStatus.ts");
const session = readProjectFile("apps/web/src/space/SpaceSession.tsx");
const hud = readProjectFile("apps/web/src/space/SpaceHud.tsx");
const focus = readProjectFile("apps/web/src/exhibits/FocusOverlay.tsx");
const factory = readProjectFile("apps/web/src/rendering/createWebGPURenderer.ts");
const pipeline = readProjectFile("apps/web/src/rendering/GalleryRenderPipeline.tsx");
const topbar = readProjectFile("apps/web/src/components/TopBar.tsx");

assert.equal((canvasHost.match(/<Canvas\b/g) ?? []).length, 1, "production SPACE must have one main Canvas owner");
assert.equal((session.match(/<Physics\b/g) ?? []).length, 1, "production SPACE must have one Physics owner");
assert.equal((session.match(/<SpaceScene\b/g) ?? []).length, 1, "production SPACE must have one SpaceScene owner");
assert.doesNotMatch(desktop + canvasHost + session + focus, /FullSpaceRuntime|SimplifiedSpaceRuntime/);
assert.doesNotMatch(canvasHost, /isWebGPUSupported|navigator\.gpu/);
assert.match(canvasHost, /dpr=\{resolveRendererDpr\(resolvedProfile\)\}/);
assert.match(canvasHost, /switchRendererProfileState\(/);
assert.match(canvasHost, /resolvedProfile \? \(/, "scene must wait until the actual backend resolves");
assert.match(session, /profile\.postProcessing \? <GalleryRenderPipeline/);
assert.match(session, /<GalleryAtmosphere\s*\/>/);
assert.doesNotMatch(session, /profile\.expensiveLeaves\.galleryAtmosphere/);
assert.match(canvasHost, /resolvedProfile\.shadows && useShadows/);
assert.match(factory, /requestedProfile/);
assert.match(factory, /onResolved/);
assert.doesNotMatch(factory, /requestAdapter|logWebGPUAdapterInfo/);
assert.match(
  factory,
  /disposeRendererIfCanvasDetached\(renderer, props\.canvas\)/,
  "a renderer that resolves after its Canvas unmounts must be disposed before returning to R3F",
);
assert.match(focus, /profile: RendererProfileId/);
assert.match(focus, /resolveFocusRequestedProfile\(profile\)/);
assert.match(focus, /dpr=\{resolveRendererDpr\(resolvedFocusProfile\)\}/);
assert.match(factory, /antialias: false/);
assert.match(pipeline, /disposeOwnedRenderPipeline\(pipeline\)/, "owned post pipeline must be disposed on unmount");
assert.doesNotMatch(pipeline, /scene\.dispose|material\.dispose|useGLTF/, "pipeline cleanup must not dispose shared assets");
assert.match(topbar, /setQualityPreset/);
assert.match(topbar, /qualityPreset === "full"/);
assert.match(topbar, /qualityPreset === "simplified"/);
assert.doesNotMatch(topbar, /toggleAntialias|type="checkbox"/);
assert.match(canvasHost, /bridgeRendererInitialization\(/);
assert.match(focus, /bridgeRendererInitialization\(/);
assert.match(canvasHost, /reportRendererInitializationErrorIfMounted\(/);
assert.match(focus, /reportRendererInitializationErrorIfMounted\(/);
assert.doesNotMatch(
  readProjectFile("apps/web/src/rendering/rendererLifecycle.ts"),
  /const PENDING_RENDERER_INITIALIZATION/,
);
assert.match(canvasHost, /resolveSpaceCanvasStatus\(rendererRuntime/);
assert.match(canvasStatus, /const error = scopeMatches \? runtime\.error : null/);
assert.match(canvasHost, /<SpaceCanvasSurfaceSlot status=\{status\} renderSurfaces=\{renderSurfaces\}/);
assert.doesNotMatch(canvasHost, /onProfileResolved|onRendererError/);
assert.doesNotMatch(desktop, /setResolvedProfile|setRendererError/);
assert.match(hud, /rendererFailed \? <WebGPUUnavailable/);
assert.match(focus, /rendererError[\s\S]*className="focus-error" role="alert"/);
assert.doesNotMatch(focus, /if \(focusRenderer\.requestedProfile !== profile\)[\s\S]*setFocusRenderer/);
assert.match(hud, /role="status"[\s\S]*t\("space\.loading"\)/);
assert.match(focus, /resolvedFocusProfile \? null : <FocusLoading/);
assert.match(focus, /className="focus-error" role="alert"/);
assert.match(focus, /<FocusModelErrorBoundary\s+key=\{`\$\{exhibit\.exhibitId\}-\$\{profile\}`\}/);
assert.match(focus, /className="focus-error" role="alert"[\s\S]*this\.props\.message/);

console.log("renderer runtime profile contract tests passed");
