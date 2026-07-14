import assert from "node:assert/strict";
import { readProjectFile } from "../helpers/projectPaths.mjs";

const desktop = readProjectFile("apps/web/src/pages/SpaceDesktopExperience.tsx");
const focus = readProjectFile("apps/web/src/exhibits/FocusOverlay.tsx");
const factory = readProjectFile("apps/web/src/rendering/createWebGPURenderer.ts");
const pipeline = readProjectFile("apps/web/src/rendering/GalleryRenderPipeline.tsx");
const topbar = readProjectFile("apps/web/src/components/TopBar.tsx");

assert.equal((desktop.match(/<Canvas\b/g) ?? []).length, 1, "production SPACE must have one main Canvas owner");
assert.equal((desktop.match(/<Physics\b/g) ?? []).length, 1, "production SPACE must have one Physics owner");
assert.equal((desktop.match(/<SpaceScene\b/g) ?? []).length, 1, "production SPACE must have one SpaceScene owner");
assert.doesNotMatch(desktop + focus, /FullSpaceRuntime|SimplifiedSpaceRuntime/);
assert.doesNotMatch(desktop, /isWebGPUSupported|navigator\.gpu/);
assert.match(desktop, /dpr=\{resolveRendererDpr\(resolvedProfile\)\}/);
assert.match(desktop, /switchRendererProfileState\(/);
assert.match(desktop, /resolvedProfile \? \(/, "scene must wait until the actual backend resolves");
assert.match(desktop, /resolvedProfile\.postProcessing \? \(\s*<GalleryRenderPipeline/);
assert.match(desktop, /resolvedProfile\.expensiveLeaves\.galleryAtmosphere/);
assert.match(desktop, /resolvedProfile\.shadows && useShadows/);
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
assert.match(desktop, /bridgeRendererInitialization\(/);
assert.match(focus, /bridgeRendererInitialization\(/);
assert.match(desktop, /rendererRuntime\.error[\s\S]*<WebGPUUnavailable/);
assert.match(focus, /rendererError[\s\S]*FocusLoading/);
assert.doesNotMatch(focus, /if \(focusRenderer\.requestedProfile !== profile\)[\s\S]*setFocusRenderer/);

console.log("renderer runtime profile contract tests passed");
