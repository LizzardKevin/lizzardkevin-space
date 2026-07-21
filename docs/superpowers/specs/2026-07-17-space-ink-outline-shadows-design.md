# SPACE Ink Outlines And Sharp Shadows Design

**Status:** Approved by the user on 2026-07-17 via the kimi/frontend-enhancement plan.

## Scope

Push the desktop first-person gallery from its current "half toon" state (flat four-band color, no outlines, no shadows, no saturated accents) toward the approved Messenger reference language: bold ink outer contours, sharp shadows, and restrained saturated accents, while holding the shipped V2 performance budget.

User-confirmed decisions on 2026-07-17:

1. Outline style is the bold comic outer contour (like the StartLobby title), not an all-edge wireframe and not layered thick-plus-thin lines.
2. Outlines ship in both renderer profiles (full/WebGPU and simplified/WebGL2). Dynamic shadows remain full-profile only.
3. Color stays inside the V2 token palette; saturation is only raised on small accents (exhibit hover, interaction cues).

Out of scope: GLB/Blender/texture/audio assets, camera/FOV/spawn/physics/interaction, the mobile 2D terminal experience, HUD structure, and any new runtime dependency.

## Current-State Facts This Design Relies On

- Renderer: `createWebGPURenderer.ts` (WebGPU with WebGL2 fallback), NeutralToneMapping at 1.15, `antialias: false` with a dead `ENABLE_GALLERY_RENDERER_ANTIALIAS` switch (`galleryConfig.ts`).
- Post: hand-written TSL `RenderPipeline` in `GalleryRenderPipeline.tsx` (bloom on, grade/vignette off), mounted only when `profile.postProcessing` (`SpaceSession.tsx`), so simplified has no post pipeline at all.
- Shadows: fully plumbed but globally off (`ENABLE_GALLERY_RUNTIME_SHADOWS = false`); Canvas `shadows` gate at `SpaceCanvasHost.tsx`; key directional light at `SpaceSession.tsx` has no `castShadow`, target, or fitted shadow camera.
- Materials: prefix-driven dispatch in `galleryStyleMaterials.ts`; `ARCH_`/`PLASTER_`/`STRUCT_*` families already share four-band `MeshToonMaterial`; `GLASS_`/`LIGHT_`/`bulb_`/`METAL_`/`EXHIBITS_` stay exported PBR.
- Tokens: `spaceVisualTokens.ts` (brandTeal/ink/paper/atmosphere/signal). V2 contract `docs/design/space-visual-system-v2.md` line 68 previously banned outline passes and outline geometry; the V3 addendum in that file supersedes it.

## Ink Outline Decision

Use CPU-precomputed inverted-hull ink shells, not a screen-space edge-detection pass:

- The approved look is the outer contour only; inverted hull draws exactly silhouettes and reads as a comic ink line.
- It needs no post pipeline, so the simplified profile gets outlines at zero extra pass cost.
- It is backend-agnostic (a plain merged mesh with a shared `MeshBasicMaterial`), avoiding TSL/GLSL divergence between WebGPU and WebGL2.

Implementation contract:

1. New module `apps/web/src/scenes/gallery/galleryInkOutline.ts`. For each stylized-family mesh (`ARCH_`, `PLASTER_`, `STRUCT_*`): weld vertices (`mergeVertices`), compute smooth normals, extrude along the normal by a world-space width (default `0.035`, tuned down from 0.06 after manual review so lines hug the mesh), and merge per family into one geometry. Walkable surfaces (`STRUCT_FLOOR_`, `ARCH_FLOOR_`, `STRUCT_STAIR_`, `ARCH_STAIR_`) are exempt — their shells read as noise underfoot.
2. One shared `MeshBasicMaterial`: color `ink` (`#17282a`), `toneMapped: false`, `side: THREE.BackSide`.
3. Hook: inside the existing stylization traversal in `prepareGalleryScene.ts`; same exemption list as bloom (`GLASS_`, `LIGHT_`, `bulb_`, `TEMP_BLOCKER_`, `COL_`).
4. SPACE exhibit clones stay outline-free. Their authored silhouettes, materials, and shadows provide separation; `SceneExhibitPlacement.tsx` must not mount ink shells while the exhibit outline gate is disabled.
5. Config: `ENABLE_GALLERY_INK_OUTLINES` (default true), `ENABLE_EXHIBIT_INK_OUTLINES` (default false), and `GALLERY_INK = { width, color, perFamily }` in `galleryConfig.ts`; new `inkOutline` token in `spaceVisualTokens.ts`.
6. Escape hatch: a mesh whose shell shows artifacts joins an explicit exemption list instead of weakening the whole system.

## Sharp Shadow Decision (Full Profile Only)

1. `ENABLE_GALLERY_RUNTIME_SHADOWS` takes effect only when `profile.shadows` is true; the simplified profile never mounts shadow maps (V2 profile table unchanged).
2. The key directional light at `SpaceSession.tsx` gains `castShadow` plus a helper that fits an orthographic shadow camera to the `space_main.glb` bounding box with a fixed target. Its position is raised from `[-8, 5, 6]` to `[-5, 10, 4]` (~57° elevation, up from ~27°) so shadows visibly land on the floor; the toon banding follows the same direction as before by design.
3. 4096px shadow map; `PCFShadowMap` after manual review (`BasicShadowMap`'s unfiltered edges read as harsh jaggies at 1080p). The 4096 preset is retained to preserve exhibit and architecture edge definition; tune `normalBias` on captures.
4. Static-update policy: `renderer.shadowMap.autoUpdate = false`; set `needsUpdate = true` only on scene changes (exhibit mount/unmount, Focus open/close). Steady-state per-frame shadow cost is effectively zero.
5. Glass, emissive, and projector surfaces never cast; the eight bulb point lights never cast shadows.

## Antialiasing Decision

1. Full profile: append an FXAA node at the end of the TSL chain in `buildPostFxOutput` (use the stock `FXAANode` if present in three 0.184, otherwise a small luma FXAA), and include it in the `postFxEnabled` condition.
2. Simplified profile: wire `ENABLE_GALLERY_RENDERER_ANTIALIAS` through `createWebGPURenderer.ts` (WebGL2 MSAA at DPR 1). If measurement regresses, fall back to a minimal FXAA-only TSL pipeline for simplified.
3. Verify both render paths (pipeline-taken and R3F default) with captures.

## Accent Decision

- Exhibit hover emissive (`ExhibitHoverHighlight.tsx`) moves to `signal` `#ef8b61`.
- Crosshair, movement hint, and selected states keep `brandTeal`; no large surface gets a saturated wash.
- Pure flat accent materials use `toneMapped: false` to survive NeutralToneMapping.
- No V2 token value changes.

## Documentation And Contract Updates

- This spec lands before implementation (docs commit).
- `docs/design/space-visual-system-v2.md` gains a V3 addendum: the line-68 ban on outline passes/geometry is withdrawn, and the profile table is restated as simplified = outlines on, shadows off, bloom off; full = all on.

## Testing

- New contract tests under `apps/web/tests/space/`: outline family coverage/exemption lists, `inkOutline` token presence, simplified config has outlines but no shadow map, full profile shadow configuration exists.
- Update `visual-system.contract-test.mjs` and `runtime-profile.contract-test.mjs` where assertions are affected.
- `node --test` unit tests for `galleryInkOutline` geometry generation (weld count, extrusion distance, merged output) on small fixtures.
- TDD: every production change lands after a failing test.
- `npm run verify:quick` stays green.

## Acceptance

- All screenshot QA uses 1920x1080 (1080p), DPR 1, the Enter flow, spawn and walked viewpoints. A fresh BEFORE baseline at 1080p is captured before implementation; before/after pairs are judged side by side. The 1440x900 diagnostic captures from planning are not a baseline.
- Full-profile effects are never inferred from headless runs; native WebGPU acceptance follows the V2 native protocol at 1920x1080 with OS/GPU/Chrome recorded.
- Performance: `npm run performance:browser` before and after (3 cold + 3 warm each). V2 hard gates apply: steady RAF median and p95 within baseline max + max(10%, 2ms); JS heap within baseline max + max(10%, 8MiB); request counts do not grow; protected asset hashes unchanged; any monotonic growth or new page error blocks release.
- Interaction regression: pointer lock, WASD, Focus open/close, and route round-trip produce no new console errors.
