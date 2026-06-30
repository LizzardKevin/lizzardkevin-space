# SPACE Visual Style Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a WebGPU-first, Flat Kit inspired `1 + 2 + 4` visual pass for SPACE that keeps the gallery clean, adds gentle cel separation and height/distance atmosphere, and protects a 2K/60fps performance target.

**Architecture:** Keep the current WebGPU/R3F stack and GLB asset as the source of truth. Add small runtime style modules that classify existing GLB materials, tune atmosphere and post output, and avoid heavy full-screen effects such as GTAO, dynamic shadows, or thick outlines.

**Tech Stack:** React 19, @react-three/fiber, Three.js WebGPURenderer, Three TSL RenderPipeline, node:test contract tests, Vite.

---

## File Structure

- Modify `apps/web/src/scenes/gallery/galleryConfig.ts`: central style budget and palette constants.
- Modify `apps/web/src/scenes/gallery/GalleryAtmosphere.tsx`: fog/background tuning using existing scene state.
- Modify `apps/web/src/rendering/GalleryRenderPipeline.tsx`: lightweight color-grade/vignette/bloom tuning inside the existing WebGPU pipeline.
- Modify `apps/web/src/scenes/gallery/prepareGalleryScene.ts`: apply style preparation to visible GLB meshes without touching colliders or exhibit placement.
- Create `apps/web/src/scenes/gallery/galleryStyleMaterials.ts`: selective material classification and low-cost cel/PBR hybrid helpers.
- Create `apps/web/tests/space/gallery-style-materials.test.mjs`: contract tests for mesh-family classification and material preservation.

### Task 1: Style Material Contracts

**Files:**
- Create: `apps/web/tests/space/gallery-style-materials.test.mjs`
- Create: `apps/web/src/scenes/gallery/galleryStyleMaterials.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Create `apps/web/tests/space/gallery-style-materials.test.mjs` with tests that assert:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldPreserveGalleryMaterial,
  shouldStylizeGalleryMaterial,
} from "../../src/scenes/gallery/galleryStyleMaterials.ts";

test("stylizes architecture and floor mesh families", () => {
  assert.equal(shouldStylizeGalleryMaterial("ARCH_CEILING_PLASTER_WHITE_022"), true);
  assert.equal(shouldStylizeGalleryMaterial("STRUCT_FLOOR_MAIN"), true);
  assert.equal(shouldStylizeGalleryMaterial("ARCH_STAIR_001"), true);
});

test("preserves glass metal lights collisions markers and exhibits", () => {
  for (const name of [
    "GLASS_CLEAR_001",
    "METAL_ALUMINUM_RAIL_001",
    "LIGHT_GENERIC_LIGHT_PANEL_001",
    "COL_WALL_023",
    "spawn_player_main",
    "ANCHOR_ARCH_TREEHABITAT",
    "EXHIBITS_FRAME_001",
  ]) {
    assert.equal(shouldPreserveGalleryMaterial(name), true, name);
    assert.equal(shouldStylizeGalleryMaterial(name), false, name);
  }
});
```

- [ ] **Step 2: Run test and verify red**

Run: `node --test apps/web/tests/space/gallery-style-materials.test.mjs`

Expected: FAIL because `galleryStyleMaterials.ts` does not exist.

- [ ] **Step 3: Implement minimal style classifier**

Create `galleryStyleMaterials.ts` exporting the two functions used by the test.

- [ ] **Step 4: Add the test to `npm run test:unit`**

Append `apps/web/tests/space/gallery-style-materials.test.mjs` to the root `test:unit` script.

- [ ] **Step 5: Run the test and unit suite**

Run: `node --test apps/web/tests/space/gallery-style-materials.test.mjs`

Run: `npm run test:unit`

Expected: both pass.

### Task 2: Selective Runtime Stylization

**Files:**
- Modify: `apps/web/src/scenes/gallery/galleryStyleMaterials.ts`
- Modify: `apps/web/src/scenes/gallery/prepareGalleryScene.ts`
- Modify: `apps/web/src/scenes/gallery/galleryConfig.ts`

- [ ] **Step 1: Add contract tests for material action**

Extend `gallery-style-materials.test.mjs` to assert architecture/floor meshes return a `stylize` action while glass/metal/light/exhibit meshes return `preserve`.

- [ ] **Step 2: Run test and verify red**

Run: `node --test apps/web/tests/space/gallery-style-materials.test.mjs`

Expected: FAIL because action helpers do not exist.

- [ ] **Step 3: Implement selective material preparation**

Add a helper that returns a low-cost `MeshToonMaterial` for architecture/floor/stair families using the existing toon gradient map and tuned per-family colors. Do not dispose or replace glass, metal, light, exhibit, or collision materials.

- [ ] **Step 4: Wire helper into `prepareGalleryScene`**

Call the helper only when a new `ENABLE_GALLERY_SELECTIVE_STYLIZATION` config flag is true. Keep `ENABLE_GALLERY_OVERRIDE_MATERIALS` false.

- [ ] **Step 5: Run tests**

Run: `node --test apps/web/tests/space/gallery-style-materials.test.mjs`

Run: `npm run test:unit`

Expected: both pass.

### Task 3: Atmosphere And Post Pipeline Tuning

**Files:**
- Modify: `apps/web/src/scenes/gallery/galleryConfig.ts`
- Modify: `apps/web/src/scenes/gallery/GalleryAtmosphere.tsx`
- Modify: `apps/web/src/rendering/GalleryRenderPipeline.tsx`

- [ ] **Step 1: Tune existing constants**

Set palette, fog density, ambient/key/fill/hemisphere, bloom, exposure, and vignette values for a clean warm/cool `1 + 4` base. Keep runtime shadows disabled.

- [ ] **Step 2: Add lightweight color-grade node**

Inside the existing `GalleryRenderPipeline`, add optional brightness/contrast/saturation style grading in TSL. Reuse the existing scene pass instead of adding a new full-screen pass.

- [ ] **Step 3: Run type/lint checks**

Run: `npm exec -w apps/web tsc -- --noEmit -p tsconfig.app.json`

Run: `npm run lint`

Expected: both pass.

### Task 4: Visual And Performance Validation

**Files:**
- No committed files unless tests or code reveal required fixes.

- [ ] **Step 1: Run dev server**

Run: `npm run dev:local`

- [ ] **Step 2: Capture 2K before/after screenshots**

Use the in-app browser at `2560x1440`, enter SPACE, wait for the scene to settle, and capture screenshot evidence.

- [ ] **Step 3: Measure 2K debug FPS**

Read the visible debug overlay after the scene settles. If FPS is below 60, reduce style cost before adding more effects.

- [ ] **Step 4: Run quick verification**

Run: `npm run verify:quick`

Run: `npm run build:chunks`

Expected: both pass before handoff.

## Self Review

- Scope is limited to SPACE visual presentation and performance tuning.
- The plan avoids Tree Habitat content, exhibit page desktop layout, projector installation, language stats, and desktop resolution changes.
- The first implementation task has a red/green automated test before production code.
- Visual acceptance requires screenshot evidence and 2K FPS notes, not just passing TypeScript.
