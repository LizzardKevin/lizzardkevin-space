import assert from "node:assert/strict";
import test from "node:test";
import { importSourceModule, readSourceFile } from "../helpers/projectPaths.mjs";

test("antialiasing switches are explicit and enabled", async () => {
  const config = await importSourceModule("scenes/gallery/galleryConfig.ts");

  assert.equal(config.ENABLE_GALLERY_RENDERER_ANTIALIAS, true);
  assert.equal(config.ENABLE_GALLERY_FXAA, true);
});

test("renderer honors the antialias switch instead of a hardcoded false", () => {
  const source = readSourceFile("rendering/createWebGPURenderer.ts");

  assert.match(source, /ENABLE_GALLERY_RENDERER_ANTIALIAS/, "renderer reads the config switch");
  assert.match(
    source,
    /antialias:\s*ENABLE_GALLERY_RENDERER_ANTIALIAS/,
    "canvas MSAA (the simplified profile AA path) follows the switch",
  );
});

test("full profile pipeline appends FXAA and counts it as post work", () => {
  const pipeline = readSourceFile("rendering/GalleryRenderPipeline.tsx");

  assert.match(pipeline, /three\/addons\/tsl\/display\/FXAANode\.js/, "stock FXAA node");
  assert.match(pipeline, /ENABLE_GALLERY_FXAA/, "FXAA has its own config switch");
  assert.match(
    pipeline,
    /renderOutput\(out, ctx\.toneMapping, ctx\.outputColorSpace\)[\s\S]*fxaa\(out\)/,
    "FXAA receives display-referred sRGB after tone mapping/output conversion",
  );
  assert.match(
    pipeline,
    /pipeline\.outputColorTransform = !ENABLE_GALLERY_FXAA/,
    "the pipeline must not apply output conversion twice after FXAA",
  );
  assert.match(
    pipeline,
    /pass\(scene, camera, \{ samples: ENABLE_GALLERY_FXAA \? 0 : undefined \}\)/,
    "full-profile FXAA must not also multisample the expensive scene pass",
  );
  assert.match(
    pipeline,
    /postFxEnabled\s*=\s*bloomEnabled \|\| ENABLE_GALLERY_COLOR_GRADE \|\| ENABLE_GALLERY_VIGNETTE \|\| ENABLE_GALLERY_FXAA/,
    "FXAA keeps the pipeline mounted even when bloom is off",
  );
});
