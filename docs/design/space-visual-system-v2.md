# SPACE Main Gallery Visual System V2

**Status:** implementation contract prepared from the pre-change browser baseline. This document defines the Phase 9 acceptance target; it does not claim the target has shipped.

## Intent

SPACE remains a first-person portfolio gallery. The Messenger reference is used for composition principles—one coherent world, a strong first-frame focal axis, broad toon color blocks, atmospheric depth, clear silhouettes, and one HUD language—not as a scene or asset to copy.

The implementation must reuse the current `space_main.glb`, exported materials, exhibit content, camera/physics/interaction model, TopBar, and existing SPACE entry palette. It must not edit or re-export GLB, Blender, texture, audio, workbook, generated content, or source media.

## Evidence and capture limits

Fixed baseline protocol:

- Candidate: `477fa09` served by Vite development server at `http://127.0.0.1:5173/`.
- Viewport: 1440 × 900 CSS pixels, DPR 1.
- Route/state: `/`, entered main gallery, resolved spawn `[-0.51, 36.897, -48.318]`, initial look direction `[0, 0, 1]`.
- Debug overlay hidden for visual judgment only; no scene or asset state was changed.
- Input variants: normal motion and `prefers-reduced-motion: reduce`.
- Browser: standalone Playwright Chromium. Headless SwiftShader resolved both a requested `full` run and a requested `simplified` run to actual WebGL2 `simplified`.

Baseline files live outside the repository in:

`C:\Users\lizza\.codex\visualizations\2026\07\14\019f5ea2-1eef-74e3-8dbe-cfd03eafb830\space-architecture-v2`

| Requested state | Actual profile | Evidence |
| --- | --- | --- |
| Full, normal motion | WebGL2 simplified | `phase9-gallery-requested-full-actual-simplified-1440x900.png` |
| Simplified, normal motion | WebGL2 simplified | `phase9-gallery-requested-simplified-actual-simplified-1440x900-repeat.png` |
| Simplified with settings open | WebGL2 simplified | `phase9-gallery-requested-simplified-actual-simplified-1440x900-repeat-settings.png` |
| Simplified with keyboard focus | WebGL2 simplified | `phase9-gallery-requested-simplified-actual-simplified-1440x900-keyboard-focus.png` and `phase9-gallery-focus-baseline.json` |
| Simplified, reduced motion | WebGL2 simplified | `phase9-gallery-requested-simplified-actual-simplified-1440x900-reduced.png` |
| Reference composition | n/a | `messenger-reference.png` |

Native WebGPU/full screenshots and GPU-memory measurements are unavailable in headless Chromium and remain an explicit native-browser release check. They must never be inferred from the requested setting.

The first simplified capture and both earlier requested-full/settings captures showed transient black surfaces and are rejected as visual evidence. The repeat captures above are the accepted baseline; the post-change protocol must likewise repeat any visibly incomplete frame instead of treating it as a pass. The keyboard baseline focuses the first TopBar button through a real `Tab` keypress and records its current 1px outline; the candidate must meet the stronger focus rule below.

## Baseline diagnosis

The current spawn provides a useful central corridor and ceiling-grid vanishing point, but the visible world is almost entirely neutral gray. The implementation actively removes chroma from preserved GLB materials, while `simplified` also disables `GalleryAtmosphere`; this makes distant and adjacent surfaces merge into flat value blocks. The tiny translucent TopBar lacks a stable relationship to the scene palette and the navigation text loses contrast over bright ceiling panels. These are code-owned issues, not evidence that the GLB must be changed.

## Executable color roles

These roles extend the already-shipped StartLobby and MobileStartMenu palette. Values are CSS/Three sRGB hex colors and must be centralized in `spaceVisualTokens.ts` before being consumed by gallery configuration or HUD styles.

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Brand field | `brandTeal` | `#67c2be` | Entry continuity, selected HUD state, restrained exhibit/interaction accent |
| Deep ink | `ink` | `#17282a` | HUD surfaces, strongest silhouette/rail separation, focus outlines |
| Warm paper | `paper` | `#f3f0e7` | Text on ink, ceiling/highlight tier, loading copy |
| Atmospheric field | `atmosphere` | `#a9bfbc` | Gallery background and fog in both profiles |
| Architecture mid | `architecture` | `#c7d0cc` | Large structural forms |
| Wall light | `wall` | `#9eaeaa` | Wall/plaster tier |
| Floor dark | `floor` | `#3f4d4d` | Floor and stair tier; anchors the first-person plane |
| Ceiling light | `ceiling` | `#e8e4d8` | Ceiling panels and high-value focal surfaces |
| Cool metal | `metal` | `#667271` | Aluminum and railings, matte and distinct from floor |
| Warm signal | `signal` | `#ef8b61` | Small warnings/attention moments only; never a full surface wash |

Authored exhibit and non-structural GLB chroma must be preserved. The runtime may normalize known aluminum and light meshes, but must not globally desaturate every preserved material.

## Material and depth hierarchy

1. Large architecture, plaster, wall, floor, stair, and ceiling mesh families use the existing low-cost toon material path and the named color roles above.
2. Toon bands remain four discrete tiers: shadow `#31413f`, mid `#69827e`, light `#b9cbc6`, highlight `#f3f0e7`. Their hues follow the cool atmosphere/paper system rather than neutral grayscale.
3. Exhibits, glass, authored props, and unknown preserved meshes retain their exported color and material properties. This is essential for artwork hierarchy.
4. Aluminum remains matte, visibly distinct from the floor, and darker than walls/ceiling. Light meshes remain bright, emissive, and tone-map independent.
5. Basic outline/depth separation comes from dark floor/metal silhouettes, toon band transitions, fog, and value contrast. Phase 9 must not add a screen-space outline pass or duplicate geometry solely for outlines.

## Fog, light, and camera

- Both `full` and `simplified` mount one inexpensive scene atmosphere. `simplified` must never remove fog.
- Use `THREE.FogExp2` with background/fog `#a9bfbc` and density `0.008`. Linear fallback values, retained only for the existing development toggle, are near `12` and far `42`.
- Lighting is fixed to ambient intensity `0.28`; hemisphere sky `#dce9e4`, ground `#3f4d4d`, intensity `0.55`; key position `[-8, 5, 6]`, color `#f3f0e7`, intensity `1.0`; fill position `[5, 3, -7]`, color `#67c2be`, intensity `0.22`.
- Simplified uses authored/emissive light surfaces and does not add bulb point lights. Full may retain a measured, bounded bulb-light count, but dynamic shadows remain opt-in and budget-gated.
- Gallery post/bloom configuration must have one authority. A dead global enable switch and a contradictory quality-profile value cannot coexist.
- Preserve current spawn, FOV `70`, physics, look direction, pointer controls, and first-person scale. Phase 9 does not reposition the camera or edit collision geometry.
- The initial corridor remains the first-frame focal axis; HUD must not cover its vanishing point.

## HUD language

- TopBar, settings panel, movement hint, crosshair, loading, errors, and playback controls use the same ink/paper/teal roles.
- Keep the TopBar at top `8px` and height `36px`. Its interactive cluster uses ink at `0.78` alpha, a 1px paper border at `0.28` alpha, 4px inline padding, and square corners. Do not use `mix-blend-mode` or text glow.
- TopBar buttons use paper, 13px type, weight 650, line-height 1, letter-spacing `0.08em`, and at least 32px target height. The settings trigger remains 32px square.
- The settings panel remains at most 360px wide, uses 12px type, 12px padding, 10px row gap, square corners, ink at `0.94` alpha, and a 1px paper border at `0.22` alpha. Selected segments use brand teal at `0.28` alpha with paper text.
- Paper text on ink and ink text on brand teal must each measure at least 4.5:1 by the visual-system contract test. Controls retain current semantic HTML.
- Selected/active states use `brandTeal`; failure states may use `signal`. Every keyboard-focusable gallery HUD control uses a 3px paper outline with 3px offset.
- HUD changes cannot move navigation responsibility into the Canvas or replace native buttons/links.

## Motion and reduced motion

- World motion remains player-driven. No ambient camera drift, continuous decorative animation, or new perpetual RAF is introduced.
- Hover/focus/route transitions may use opacity/color transforms no longer than 220 ms.
- `prefers-reduced-motion: reduce` removes nonessential transitions, automatic idle camera drift, onboarding float loops, and nonessential cursor/crosshair pulses; scene composition, fog, color hierarchy, user-driven walking/look input, and route state remain identical.

## Profile contract

| Capability | Full (actual WebGPU only) | Simplified (actual WebGL2) |
| --- | --- | --- |
| Same Canvas/Rapier/SpaceScene/assets/interactions | Required | Required |
| Brand/background/material hierarchy | Required | Required |
| Cheap fog and base lighting | Required | Required |
| Authored exhibit chroma | Required | Required |
| Readable HUD and focus-visible | Required | Required |
| DPR | Up to 2 | 1 |
| Dynamic shadows | Allowed when measured | Off |
| Bloom/glow/high-cost post | Allowed when measured | Off |
| Additional atmosphere geometry/particles | Allowed only within budget | Off |

The profile implementation should name expensive leaves by their actual cost. Cheap fog is a base scene feature, not an `expensiveLeaves` member.

## Visual acceptance table

All screenshot judgments use the fixed baseline viewport, route, spawn, look direction, DPR, and actual backend. “Pass” requires the post-change screenshot to be placed beside its matching baseline/reference in one comparison input.

| Acceptance item | Objective check | Automated evidence | Native/manual remainder |
| --- | --- | --- | --- |
| World consistency | Scene and HUD share teal/ink/paper roles; no unrelated palette | Matched normal/reduced screenshots | Native full screenshot |
| First-frame focus | Corridor endpoint and ceiling grid remain the dominant axis; TopBar does not obscure it | Same-pose 1440×900 screenshot | None |
| Color hierarchy | Structural tiers are distinguishable and authored exhibit chroma is visible | Pixel/screenshot comparison plus token/material tests | Inspect three representative exhibits |
| Spatial depth | Near floor, mid walls, and far endpoint remain separable; simplified visibly contains fog | Scene graph assertion plus screenshot | Native full comparison |
| Silhouette separation | Floor/metal remain darker than walls/ceiling; no expensive outline pass | Token contrast tests and source contract | None |
| HUD readability | Navigation/settings/hints readable over bright ceiling and dark floor; 3px focus visible | Settings-open and keyboard screenshots | None |
| Input parity | Mouse look, touch drag, keyboard movement, pointer lock, routes, and Focus behavior unchanged | Playwright interaction/lifecycle suite | One physical touch device |
| Reduced motion | No nonessential ambient/transition motion; visual hierarchy unchanged | Reduced-motion screenshot and interaction suite | None |
| Profile truth | Requested full that resolves WebGL2 is labeled/tested simplified; full is never faked | Renderer profile tests and browser metadata | Native WebGPU/full run |
| Performance | Simplified adds no post pass, shadow map, extra Canvas, recurring timer, or asset request; frame/heap change stays within measured noise band | Phase 8 harness before/after | Native GPU memory where exposed |

## Reproducible performance and native-device protocols

The performance authority is `scripts/measure-space-browser-performance.mjs`, invoked through `npm run performance:browser`, with its checked-in report at `docs/performance/space-browser-baseline.json` and interpretation in `docs/performance/space-asset-baseline.md`. Phase 9 cannot declare a performance pass until those Phase 8 artifacts exist.

Rerun the fixed production-preview protocol with three cold and three warm samples per scenario:

```text
npm run performance:browser -- --base-url http://127.0.0.1:4176 --samples 3 --playwright-module <installed-playwright-package-directory> --output <candidate-report.json>
```

Hard gates: mobile and every cold content route have zero 3D requests; lobby/pre-Enter has zero Rapier/WASM/world/Focus GLB/audio requests; route return has zero core 3D re-requests; protected asset hashes/bytes are unchanged. For the visual-only candidate, request counts and selected-work media counts must not increase. Candidate steady-RAF median and p95 must each be no worse than the corresponding baseline maximum plus `max(10%, 2ms)`; repeated-work and returned-route JS heap must each be no worse than the corresponding baseline maximum plus `max(10%, 8MiB)`. A monotonic increase across repeated work cycles or any new page error blocks release regardless of those allowances. SwiftShader absolute FPS is diagnostic only, but before/after runs must use the same browser build and flags.

Native WebGPU/full record:

1. Record OS, Chrome version, GPU/driver, viewport 1440×900, DPR 1, build SHA, and no-throttling state.
2. Clear site storage, request Full, Enter, and verify renderer metadata reports actual backend `webgpu` and profile `full`.
3. At the fixed spawn/look/FOV, save normal, settings-open, keyboard-focus, and reduced-motion screenshots plus console/page-error output and Canvas backing dimensions.
4. Inspect `arch_treehabitat`, `arch_uabb_exhibit`, and `arch_3d_printing_architecture`: authored exhibit chroma remains visible, selection/Focus works, and route return preserves pose/runtime.
5. Repeat the same flow requesting Simplified and verify actual WebGL2/profile `simplified`, DPR 1, fog present, and high-cost effects absent.
6. Store a dated pass/fail JSON or Markdown record next to the screenshots; a verbal recollection is not acceptance evidence.

Physical touch record:

1. On one phone in portrait, record model/browser/viewport; verify MobileStartMenu touch feedback, Enter, terminal route navigation to Profile/DevStories/one work, Back to terminal, visible focus where a hardware keyboard exists, and zero 3D requests if remote debugging is available.
2. On one touch-capable desktop/hybrid that still resolves the desktop shell, drag once across the StartLobby title, tap Enter, wait for the gallery, open/close settings by touch, then confirm pointer-lock/mouse and WASD still work after switching input modality.
3. Record pass/fail, console errors, and screenshots for initial/after-Enter/returned states. Any accidental double entry, stuck opaque cover, scroll leakage, or duplicate Canvas is a failure.

## Release gates and completion definition

Phase 9 is complete only when:

1. A spec commit lands before implementation.
2. Contract tests prove both profiles keep fog, palette hierarchy, authored exhibit chroma, and HUD tokens while simplified keeps high-cost effects off.
3. The exact pre-change capture protocol is rerun after implementation for normal, settings-open, and reduced-motion states.
4. Baseline and candidate are compared together at the same viewport/state, and the acceptance table is recorded with pass/fail notes.
5. Mouse, emulated touch, keyboard, pointer lock, focus-visible, routes, and reduced-motion checks pass with no new console/page errors.
6. Phase 8’s network/frame/heap protocol is rerun. Any regression outside its recorded noise band blocks completion.
7. Protected asset hashes and bytes remain unchanged.
8. Native WebGPU/full and physical-touch checks are reported as passed or explicitly left as user release checks; they are never silently converted into automated passes.

## V3 addendum (2026-07-17): ink outlines, sharp shadows, and AA

This addendum supersedes two V2 rules and is governed by `docs/superpowers/specs/2026-07-17-space-ink-outline-shadows-design.md`.

1. **The outline ban is withdrawn.** The earlier rule "Phase 9 must not add a screen-space outline pass or duplicate geometry solely for outlines" (Material and depth hierarchy, item 5) no longer applies. The approved outline mechanism is a CPU-precomputed inverted-hull ink shell: welded vertices extruded along smooth normals by `0.035`m, merged per family into a handful of draw calls, rendered with one shared `MeshBasicMaterial` (`ink`, `toneMapped: false`, `BackSide`). It covers the stylized architecture families except walkable surfaces (`STRUCT_FLOOR_`, `ARCH_FLOOR_`, `STRUCT_STAIR_`, `ARCH_STAIR_` stay outline-free), follows the bloom exemption list (`GLASS_`, `LIGHT_`, `bulb_`, `TEMP_BLOCKER_`, `COL_`), and mounts in **both** profiles. SPACE exhibit clones remain outline-free and rely on their authored silhouettes, materials, and shadows. A screen-space edge-detection pass remains rejected: the approved look is the outer contour only.
2. **Sharp dynamic shadows are now part of the full profile.** Key-light `castShadow` with a bounding-box-fitted orthographic shadow camera, 4096px map, `PCFShadowMap` (chosen over `BasicShadowMap` in manual review: unfiltered edges read as harsh jaggies), and a static-update policy (`shadowMap.autoUpdate = false`, updated only on scene changes). The 4096 preset is retained to preserve exhibit and architecture edge definition. The key light position moves from `[-8, 5, 6]` to `[-5, 10, 4]` (~57° elevation) so shadows land on the floor; this supersedes the V2 lighting table's key position. The simplified profile keeps dynamic shadows off; the profile contract table is amended accordingly: simplified = outlines on, shadows off, bloom off; full = all three on.
3. **Antialiasing becomes a stated requirement.** Full appends FXAA to the TSL pipeline; simplified enables renderer MSAA at DPR 1 (with an FXAA-only pipeline as the measured fallback). The dead `ENABLE_GALLERY_RENDERER_ANTIALIAS` switch must become real or be removed.
4. **Accent saturation stays token-bound.** Exhibit hover moves to `signal`; no V2 token values change; no large surface receives a saturated wash.
5. **Acceptance resolution changes to 1920x1080 (1080p), DPR 1**, for every automated and native screenshot protocol in this document. The 1440x900 baselines remain historical evidence only; new before/after pairs are captured at 1080p.

All other V2 contracts—color roles, toon bands, fog and lighting values, HUD language, motion rules, performance gates, and release gates—remain in force unchanged.
