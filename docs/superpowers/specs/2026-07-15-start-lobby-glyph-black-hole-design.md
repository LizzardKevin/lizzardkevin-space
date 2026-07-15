# StartLobby Exhibit Barrage and Glyph Black Hole Design

## Status

Approved visual direction: Visual Companion V3, confirmed by the user on 2026-07-15.

## Goal

Add a dense but restrained exhibit-text field behind the existing desktop StartLobby typography. Thirty-six independently scheduled title or subtitle entries move from right to left. Every visible grapheme can detach from its word when it enters the pointer's local force field, rotate independently, preserve its disturbed position and angular state after the pointer leaves, and produce a small white grinding fragment effect only when it reaches the pointer core.

The existing `LIZZARDKEVIN`, `SPACE`, and text-only `ENTER` remain the dominant foreground. Mobile remains unchanged.

## Content Source

- The workbook remains the only authoring source.
- `scripts/generate-space-content.mjs` emits a dedicated lightweight generated module for StartLobby.
- Only enabled `entry_kind=exhibit` rows are included.
- Each exhibit contributes two independent entries per language: `title` and `subtitle`.
- English and Chinese arrays are generated together. StartLobby selects the array that matches the active i18n language.
- Title and subtitle are never bound into one visual unit.
- Empty localized values are not emitted. The existing workbook validation continues to require bilingual exhibit title and subtitle values.
- The runtime never imports or parses the `.xlsx` file and never imports mobile archive data.
- The generated pool may repeat deterministically until 36 active streams exist. Repetition is expected and allowed.

## Layering and Runtime Boundary

StartLobby keeps its existing raw R3F/WebGL foreground for extruded brand typography. A sibling Canvas2D layer renders the dot field, barrage, glyph physics, and white fragments.

Layer order:

1. CSS fallback field color.
2. Canvas2D dot field and exhibit barrage.
3. Transparent raw R3F canvas with the existing extruded typography.
4. Native text-only Enter button.

The StartLobby WebGL renderer becomes transparent so the Canvas2D background remains visible. No Three, R3F, Rapier, GLB, post-processing, or audio dependency is added to the barrage module.

## Motion Model

### Streams

- Target count: 36 entries; accepted range: 30–40.
- Every stream is one workbook title or one workbook subtitle.
- Streams begin beyond the right viewport edge and move left at a small deterministic speed variation.
- Font size is smaller than the approved V2 text field; title is slightly stronger than subtitle, but both remain subordinate to the foreground SPACE word.
- Streams respawn beyond the right edge when all of their graphemes have either left the viewport or entered the black-hole core.

### Graphemes

- Text is segmented by grapheme cluster with `Intl.Segmenter` when available and a Unicode-safe fallback otherwise.
- Each grapheme has independent position, velocity, rotation, angular velocity, and alive state.
- Before disturbance, a grapheme follows its stream's stable leftward baseline.
- Within the force radius, it detaches and receives only radial acceleration toward the pointer. There is no tangential or spiral force.
- Attraction adds restrained signed angular velocity.
- After the pointer moves away, detached graphemes do not reassemble and do not restore original kerning. Their horizontal velocity eases back toward the stream's leftward velocity while vertical displacement, rotation, and a small angular inertia decay slowly.

### Core and Fragments

- A grapheme disappears only after crossing a small core radius around the pointer.
- Each consumed grapheme emits 2–3 short white rectangular fragments.
- Fragments scatter a short distance, rotate, and fade within roughly 360 ms.
- The effect must read as restrained grinding, not an explosion, glow, or particle fountain.

### Dot Field

- The full field is a low-contrast ordered dot lattice.
- Only dots inside the local pointer influence area are redrawn with inward radial displacement and mild size compression.
- No spiral, contour, ribbon, character-code, neon, or gradient language is introduced.

## Performance Design

- Canvas2D animation is capped at 30 FPS.
- Device pixel ratio is capped at 1.25.
- Work stops while the document is hidden, while StartLobby is disposing, and after unmount.
- A static offscreen dot-field bitmap avoids redrawing the whole lattice point-by-point every frame.
- Glyph metrics and glyph sprites are cached; per-frame text layout and repeated `fillText` calls are avoided.
- Undisturbed glyphs remain attached to cheap stream baselines until they enter the force radius; only disturbed glyphs require independent integration.
- Rendering culls glyphs outside a padded viewport.
- Fragment population has a hard cap and short lifetime.
- The new generated text module is lightweight and remains in the desktop StartLobby chunk only.
- No 3D scene, physics, exhibit media, or mobile dependency is imported.

## Input, Accessibility, and Lifecycle

- Existing pointer move and pointer down events update both the foreground tilt and barrage pointer without React state churn.
- Pointer leave resets the black-hole target to the approved idle position but does not repair disturbed text.
- Touch uses the same pointer path.
- `prefers-reduced-motion: reduce` renders a static, legible dot-and-text field with no continuous RAF, attraction, rotation, or fragment motion.
- The native Enter button, keyboard activation, and focus-visible behavior are unchanged.
- Barrage cleanup cancels animation and releases all canvases, caches, observers, and listeners before the existing renderer handoff completes.

## Components

- `startLobbyBarrageData.generated.ts`: build-time bilingual independent title/subtitle arrays.
- `startLobbyGlyphPhysics.ts`: pure grapheme segmentation, influence, integration, and stream-repeat helpers.
- `StartLobbyBarrage.tsx`: Canvas2D lifecycle, sprite/dot caches, rendering, 30 FPS scheduler, visibility and reduced-motion handling.
- `StartLobby.tsx`: layer composition and imperative pointer coordination only.
- `startLobby.css`: explicit barrage/WebGL/Enter stacking.

## Error Handling

- An empty generated pool falls back to static decorative dots; StartLobby and Enter still render.
- Canvas2D acquisition failure disables only the barrage.
- Missing `Intl.Segmenter` uses `Array.from` without breaking the lobby.
- All animation initialization and teardown remain safe under React StrictMode remounts.

## Verification and Acceptance

### Content contracts

- Content generation creates the dedicated bilingual StartLobby module from exhibit workbook titles and subtitles.
- Title and subtitle appear as separate entries.
- The module contains no overview, media, manifest, or mobile archive payload.
- `npm run content:check` passes.

### Unit behavior

- Thirty-six streams are created by deterministic repetition when the unique pool is smaller.
- Grapheme segmentation keeps Unicode code points intact.
- Force acceleration is radial and has no spiral term.
- A disturbed grapheme does not restore its original word offset after the pointer leaves.
- Core entry consumes one grapheme and emits only 2–3 fragments.
- Offscreen/dead streams respawn beyond the right edge.

### Contract and import boundaries

- StartLobby keeps one native Enter button and the approved 3D typography.
- The barrage imports no R3F, Three, Rapier, GLB, media, mobile archive, or post-processing dependency.
- Mobile import-graph contracts remain unchanged.
- Reduced motion contains no continuous animation scheduler.

### Visual and performance QA

- At 1440×900, 36 small independent entries remain visible or scheduled and the central title remains dominant.
- Pointer sweeps detach individual characters rather than whole words.
- Rapid pointer departure leaves dispersed, rotating characters moving left without reassembly.
- Core contact produces restrained white shards and no bright explosion.
- Mouse, touch, keyboard Enter, pointer leave, and reduced-motion states are checked.
- StartLobby maintains a capped 30 FPS scheduler, DPR ≤ 1.25, pauses when hidden, and shows no material long-task or memory regression during a one-minute lobby soak.
- `npm run verify:quick` and `npm run build:chunks` pass.

## Non-goals

- No mobile StartMenu change.
- No SPACE gallery, Rapier, GLB, Blender, exhibit media, Focus, routing, or pointer-lock change.
- No runtime workbook parser.
- No WebGPU shader rewrite.
- No spiral suction, bloom, glow, or high-count particle explosion.
